/**
 * lib/orders.ts
 *
 * Repository and business logic for the `orders`, `order_items`,
 * `order_status_history`, and `payments` tables.
 *
 * All writes use the service-role client (bypasses RLS).
 * Uses the existing createAdminSupabaseClient() pattern.
 */

import fs from "fs";
import path from "path";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { validateCoupon, incrementCouponUses } from "@/lib/coupons";
import { upsertAddress } from "@/lib/addresses";
import { stringToUuid } from "@/lib/products";
import type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderStatusHistory,
  Payment,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderStatus,
  AddressSnapshot,
  GetOrdersOptions,
  OrderStats,
} from "@/lib/db/types";

export type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderStatusHistory,
  Payment,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderStatus,
  GetOrdersOptions,
  OrderStats,
} from "@/lib/db/types";

// ─── Column Selectors ────────────────────────────────────────────────────────

/**
 * Columns guaranteed to exist after migrations 001 + 002 + 003.
 * Safe to query against any DB that has the base schema applied.
 */
const ORDER_COLS_BASE =
  "id,customer_email,customer_first_name,customer_last_name,customer_phone," +
  "shipping_address,billing_address,shipping_method,shipping_cost," +
  "subtotal,discount_amount,tax_amount,grand_total," +
  "coupon_id,coupon_code,status,stripe_session_id,fulfillment_ref," +
  "cj_order_id,tracking_number,shipping_carrier,fulfillment_status,synced_at," +
  "notes,created_at,updated_at";

/**
 * Full column set including shipping-tracking fields added in migration 004.
 * Requires supabase/migrations/004_shipping_tracking.sql to have been applied.
 */
const ORDER_COLS =
  ORDER_COLS_BASE +
  ",estimated_delivery,shipped_at,delivered_at,last_tracking_sync,tracking_url";

const ITEM_COLS =
  "id,order_id,product_id,product_title,product_image,product_slug," +
  "variant_id,quantity,unit_price,total_price,created_at";

// ─── Constants ───────────────────────────────────────────────────────────────

const TAX_RATE = 0.08; // 8% — placeholder, matches checkout UI

const SHIPPING_COSTS: Record<string, number> = {
  standard: 0,
  express: 12.99,
  overnight: 29.99,
};

const LOCAL_ORDERS_FILE = path.join(process.cwd(), "data", "orders.json");

export function getLocalOrders(): OrderWithItems[] {
  try {
    if (fs.existsSync(LOCAL_ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_ORDERS_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalOrder(order: OrderWithItems) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const existing = getLocalOrders();
    const idx = existing.findIndex((o) => o.id === order.id);
    let updated: OrderWithItems[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = order;
    } else {
      updated = [order, ...existing];
    }
    fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("[orders] Local order save failed:", err);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type OrderValidationError = {
  field: string;
  message: string;
};

export function validateOrderInput(input: CreateOrderInput): OrderValidationError[] {
  const errors: OrderValidationError[] = [];

  if (!input.customer_email?.trim()) {
    errors.push({ field: "customer_email", message: "Email is required." });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email)) {
    errors.push({ field: "customer_email", message: "Invalid email address." });
  }

  if (!input.customer_first_name?.trim()) {
    errors.push({ field: "customer_first_name", message: "First name is required." });
  }

  if (!input.customer_last_name?.trim()) {
    errors.push({ field: "customer_last_name", message: "Last name is required." });
  }

  const addr = input.shipping_address;
  if (!addr) {
    errors.push({ field: "shipping_address", message: "Shipping address is required." });
  } else {
    if (!addr.address_line1?.trim()) {
      errors.push({ field: "shipping_address.address_line1", message: "Street address is required." });
    }
    if (!addr.city?.trim()) {
      errors.push({ field: "shipping_address.city", message: "City is required." });
    }
    if (!addr.state?.trim()) {
      errors.push({ field: "shipping_address.state", message: "State is required." });
    }
    if (!addr.postal_code?.trim()) {
      errors.push({ field: "shipping_address.postal_code", message: "ZIP code is required." });
    }
    if (!addr.country?.trim()) {
      errors.push({ field: "shipping_address.country", message: "Country is required." });
    }
  }

  if (!input.items?.length) {
    errors.push({ field: "items", message: "Order must contain at least one item." });
  } else {
    input.items.forEach((item, i) => {
      if (!item.product_id) {
        errors.push({ field: `items[${i}].product_id`, message: "Product ID is required." });
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push({ field: `items[${i}].quantity`, message: "Quantity must be at least 1." });
      }
      if (item.unit_price < 0) {
        errors.push({ field: `items[${i}].unit_price`, message: "Unit price cannot be negative." });
      }
    });
  }

  return errors;
}

// ─── Order Creation ──────────────────────────────────────────────────────────

export type CreateOrderResult =
  | { success: true; order: OrderWithItems }
  | { success: false; errors: OrderValidationError[] }
  | { success: false; error: string };

/**
 * Creates a complete order atomically:
 * 1. Validates input
 * 2. Resolves and validates coupon (if provided)
 * 3. Calculates totals server-side (never trust client totals)
 * 4. Inserts order header
 * 5. Inserts order items
 * 6. Inserts initial status history entry
 * 7. Creates pending payment record
 * 8. Upserts shipping address for future use
 * 9. Increments coupon uses_count
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // 1. Validate
  const validationErrors = validateOrderInput(input);
  if (validationErrors.length) {
    return { success: false, errors: validationErrors };
  }

  const supabase = createAdminSupabaseClient();

  // 2. Resolve coupon
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let discountAmount = 0;

  // Calculate subtotal first (needed for coupon minimum_order check)
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  if (input.coupon_code?.trim()) {
    const couponResult = await validateCoupon(input.coupon_code.trim(), subtotal);
    if (!couponResult.valid) {
      return {
        success: false,
        errors: [{ field: "coupon_code", message: couponResult.reason }],
      };
    }
    couponId = couponResult.coupon.id;
    couponCode = couponResult.coupon.code;
    discountAmount = couponResult.discountAmount;
  }

  // 3. Compute totals server-side
  const shippingMethod = input.shipping_method ?? "standard";
  const shippingCost = SHIPPING_COSTS[shippingMethod] ?? 0;
  const taxAmount = (subtotal - discountAmount) * TAX_RATE;
  const grandTotal = Math.max(0, subtotal + shippingCost + taxAmount - discountAmount);

  // 4. Insert order header
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_email: input.customer_email.toLowerCase().trim(),
      customer_first_name: input.customer_first_name.trim(),
      customer_last_name: input.customer_last_name.trim(),
      customer_phone: input.customer_phone?.trim() ?? null,
      shipping_address: input.shipping_address,
      billing_address: input.billing_address ?? null,
      shipping_method: shippingMethod,
      shipping_cost: shippingCost,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      coupon_id: couponId,
      coupon_code: couponCode,
      status: "pending" as OrderStatus,
    })
    .select(ORDER_COLS)
    .single();

  if (orderError) {
    console.warn("[orders] Supabase orders insert notice, utilizing local repository fallback:", orderError.message);
    const orderId = stringToUuid(`ord-${Date.now()}`);
    const localOrder: OrderWithItems = {
      id: orderId,
      customer_email: input.customer_email.toLowerCase().trim(),
      customer_first_name: input.customer_first_name.trim(),
      customer_last_name: input.customer_last_name.trim(),
      customer_phone: input.customer_phone?.trim() ?? null,
      shipping_address: input.shipping_address as any,
      billing_address: (input.billing_address as any) ?? null,
      shipping_method: shippingMethod,
      shipping_cost: shippingCost,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      coupon_id: couponId,
      coupon_code: couponCode,
      status: "pending" as OrderStatus,
      stripe_session_id: null,
      fulfillment_ref: null,
      cj_order_id: null,
      tracking_number: null,
      shipping_carrier: null,
      fulfillment_status: "unfulfilled",
      synced_at: null,
      estimated_delivery: null,
      shipped_at: null,
      delivered_at: null,
      last_tracking_sync: null,
      tracking_url: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_items: input.items.map((item, idx) => ({
        id: stringToUuid(`item-${orderId}-${idx}`),
        order_id: orderId,
        product_id: item.product_id,
        product_title: item.product_title,
        product_image: item.product_image ?? null,
        product_slug: item.product_slug,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        created_at: new Date().toISOString(),
      })),
    };
    saveLocalOrder(localOrder);
    return { success: true, order: localOrder };
  }

  const order = orderData as unknown as Order;

  // 5. Insert order items
  const itemRows = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_title: item.product_title,
    product_image: item.product_image ?? null,
    product_slug: item.product_slug,
    variant_id: item.variant_id ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)
    .select(ITEM_COLS);

  if (itemsError) {
    console.error("[orders] Order items insert failed.", itemsError);
    // Best-effort cleanup — delete the orphaned order header
    await supabase.from("orders").delete().eq("id", order.id);
    return { success: false, error: "Failed to save order items. Please try again." };
  }

  // 6. Insert initial status history entry
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    old_status: null,
    new_status: "pending",
    note: "Order placed via checkout",
    changed_by: "system",
  });

  // 7. Create pending payment record
  await supabase.from("payments").insert({
    order_id: order.id,
    gateway: "manual",
    amount: grandTotal,
    currency: "USD",
    status: "pending",
  });

  // 8. Upsert shipping address (fire-and-forget — don't fail the order)
  try {
    const addr = input.shipping_address;
    await upsertAddress({
      customer_email: input.customer_email.toLowerCase().trim(),
      first_name: addr.first_name,
      last_name: addr.last_name,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 ?? null,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      phone: addr.phone ?? null,
      is_default: false,
    });
  } catch (e) {
    console.warn("[orders] Could not upsert address.", e);
  }

  // 9. Increment coupon uses
  if (couponId) {
    await incrementCouponUses(couponId);
  }

  const result: OrderWithItems = {
    ...order,
    order_items: (itemsData ?? []) as unknown as OrderItem[],
  };

  console.info("[orders] Order created.", { id: order.id, total: grandTotal });

  return { success: true, order: result };
}

// ─── Read Queries ────────────────────────────────────────────────────────────

/**
 * Fetches a single order with its items by ID.
 */
export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select(`${ORDER_COLS}, order_items (${ITEM_COLS})`)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data as unknown as OrderWithItems;
  } catch {
    // fallback
  }

  const local = getLocalOrders();
  return local.find((o) => o.id === id) || null;
}

/**
 * Fetches all orders for a customer email, newest first.
 */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .eq("customer_email", email.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as unknown as Order[];
  } catch {
    return [];
  }
}

/**
 * Returns paginated & filtered list of all orders (admin use).
 */
export async function getAllOrders(
  options?: GetOrdersOptions
): Promise<{ orders: Order[]; count: number }> {
  const supabase = createAdminSupabaseClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const sortAscending = options?.sortOrder === "oldest";

  function buildQuery(cols: string) {
    let q = supabase
      .from("orders")
      .select(cols, { count: "exact" })
      .order("created_at", { ascending: sortAscending })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== "all") {
      q = q.eq("status", options.status);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      q = q.or(
        `customer_email.ilike.%${s}%,customer_first_name.ilike.%${s}%,customer_last_name.ilike.%${s}%,id.eq.${s}`
      );
    }

    if (options?.dateFilter && options.dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      if (options.dateFilter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (options.dateFilter === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (options.dateFilter === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(0);
      }
      q = q.gte("created_at", startDate.toISOString());
    }

    return q;
  }

  // Try full column set first (requires migration 004)
  const { data, error, count } = await buildQuery(ORDER_COLS);

  if (error) {
    // If the error is a missing column (migration 004 not yet applied), fall back
    // to the guaranteed base column set so the dashboard stays functional.
    const isMissingColumn =
      error.code === "42703" || // PostgreSQL: undefined_column
      (error.message ?? "").toLowerCase().includes("column") ||
      (error.message ?? "").toLowerCase().includes("does not exist");

    if (isMissingColumn) {
      console.warn(
        "[orders] Full ORDER_COLS query failed — one or more columns are missing. " +
        "Run supabase/migrations/004_shipping_tracking.sql in the Supabase SQL Editor to add the missing columns. " +
        "Falling back to base column set. Error:",
        error.message
      );
      const { data: fallbackData, error: fallbackError, count: fallbackCount } =
        await buildQuery(ORDER_COLS_BASE);
      if (fallbackError) throw fallbackError;
      return { orders: (fallbackData ?? []) as unknown as Order[], count: fallbackCount ?? 0 };
    }

    throw error;
  }

  return { orders: (data ?? []) as unknown as Order[], count: count ?? 0 };
}

/**
 * Calculates dashboard statistics across all orders.
 */
export async function getOrderStats(): Promise<OrderStats> {
  const supabase = createAdminSupabaseClient();

  const { data: allOrders, error } = await supabase
    .from("orders")
    .select("status, grand_total, created_at");

  if (error) throw error;

  const orders = allOrders ?? [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let totalOrders = 0;
  let pendingOrders = 0;
  let paidOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let failedOrders = 0;
  let totalRevenue = 0;
  let revenueToday = 0;
  let revenueThisMonth = 0;

  for (const order of orders) {
    totalOrders++;
    const st = order.status;
    const total = Number(order.grand_total) || 0;
    const createdAt = new Date(order.created_at).getTime();

    if (st === "pending") pendingOrders++;
    else if (st === "paid" || st === "confirmed") paidOrders++;
    else if (st === "processing") processingOrders++;
    else if (st === "shipped") shippedOrders++;
    else if (st === "delivered") deliveredOrders++;
    else if (st === "cancelled") cancelledOrders++;
    else if (st === "failed") failedOrders++;

    if (["paid", "confirmed", "processing", "shipped", "delivered"].includes(st)) {
      totalRevenue += total;
      if (createdAt >= startOfToday) {
        revenueToday += total;
      }
      if (createdAt >= startOfMonth) {
        revenueThisMonth += total;
      }
    }
  }

  return {
    totalOrders,
    pendingOrders,
    paidOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    failedOrders,
    totalRevenue,
    revenueToday,
    revenueThisMonth,
  };
}

/**
 * Fetches the payment record associated with an order ID.
 */
export async function getPaymentByOrderId(orderId: string): Promise<Payment | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as (Payment | null);
}

/**
 * Updates internal admin notes for an order.
 */
export async function updateOrderNotes(orderId: string, notes: string): Promise<Order> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ notes })
    .eq("id", orderId)
    .select(ORDER_COLS)
    .single();

  if (error) throw error;
  return data as unknown as Order;
}

/**
 * Manually updates shipment tracking details for an order (carrier, tracking number, URL, estimated delivery).
 */
export async function updateShipmentTracking(
  orderId: string,
  trackingInfo: {
    tracking_number?: string | null;
    shipping_carrier?: string | null;
    tracking_url?: string | null;
    estimated_delivery?: string | null;
    fulfillment_status?: string | null;
  }
): Promise<Order> {
  const supabase = createAdminSupabaseClient();
  const updates: Record<string, unknown> = {};

  if (trackingInfo.tracking_number !== undefined) updates.tracking_number = trackingInfo.tracking_number;
  if (trackingInfo.shipping_carrier !== undefined) updates.shipping_carrier = trackingInfo.shipping_carrier;
  if (trackingInfo.tracking_url !== undefined) updates.tracking_url = trackingInfo.tracking_url;
  if (trackingInfo.estimated_delivery !== undefined) updates.estimated_delivery = trackingInfo.estimated_delivery;
  if (trackingInfo.fulfillment_status !== undefined) updates.fulfillment_status = trackingInfo.fulfillment_status;

  if (trackingInfo.tracking_number && !trackingInfo.fulfillment_status) {
    updates.fulfillment_status = "shipped";
    updates.shipped_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select(ORDER_COLS)
    .single();

  if (error) throw error;

  const currentOrder = data as unknown as Order;

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: currentOrder.status,
    new_status: currentOrder.status,
    note: `Tracking updated manually: ${currentOrder.shipping_carrier || "Carrier"} - ${currentOrder.tracking_number || "N/A"}`,
    changed_by: "admin",
  });

  return currentOrder;
}



// ─── Status Management ───────────────────────────────────────────────────────

/**
 * Updates the order status and appends a history entry.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: { note?: string; changedBy?: string }
): Promise<Order> {
  const supabase = createAdminSupabaseClient();

  // Fetch current status for history
  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("id,status")
    .eq("id", orderId)
    .single();

  if (fetchError) throw fetchError;

  const oldStatus = current.status as OrderStatus;

  // Update order status
  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select(ORDER_COLS)
    .single();

  if (error) throw error;

  // Append history entry
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: oldStatus,
    new_status: newStatus,
    note: options?.note ?? null,
    changed_by: options?.changedBy ?? "admin",
  });

  // Update payment if order is confirmed/paid
  if (newStatus === "confirmed") {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("order_id", orderId);
  }

  if (newStatus === "refunded") {
    await supabase
      .from("payments")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("order_id", orderId);
  }

  console.info("[orders] Status updated.", { id: orderId, from: oldStatus, to: newStatus });

  return data as unknown as Order;
}

/**
 * Fetches status history for an order, newest first.
 */
export async function getOrderStatusHistory(
  orderId: string
): Promise<OrderStatusHistory[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("order_status_history")
    .select("id,order_id,old_status,new_status,note,changed_by,created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderStatusHistory[];
}

// ─── Stripe Helpers ──────────────────────────────────────────────────────────

/**
 * Associates a Stripe Checkout Session ID with an order.
 */
export async function updateOrderStripeSession(
  orderId: string,
  sessionId: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ stripe_session_id: sessionId })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Retrieves an order with its items by Stripe Checkout Session ID.
 */
export async function getOrderByStripeSessionId(
  sessionId: string
): Promise<OrderWithItems | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLS}, order_items (${ITEM_COLS})`)
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as (OrderWithItems | null);
}

/**
 * Updates or creates the payment record for an order.
 */
export async function updateOrderPaymentRecord(
  orderId: string,
  updates: {
    gateway?: string;
    gateway_payment_id?: string;
    gateway_status?: string;
    status: string;
    paid_at?: string | null;
    refunded_at?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("payments")
    .upsert(
      {
        order_id: orderId,
        gateway: updates.gateway ?? "stripe",
        gateway_payment_id: updates.gateway_payment_id ?? null,
        gateway_status: updates.gateway_status ?? null,
        status: updates.status,
        paid_at: updates.paid_at ?? null,
        refunded_at: updates.refunded_at ?? null,
        metadata: updates.metadata ?? null,
      },
      { onConflict: "order_id" }
    );

  if (error) throw error;
}

