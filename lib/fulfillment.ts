/**
 * lib/fulfillment.ts
 *
 * High-level fulfillment orchestrator linking Supabase ecommerce orders
 * with CJ Dropshipping (and future suppliers).
 */

import { cjDropshipping } from "@/lib/cj-dropshipping";
import { getOrderById, saveLocalOrder } from "@/lib/orders";
import { getProducts } from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { notifyAdmin } from "@/lib/notifications/admin";
import type { OrderWithItems } from "@/lib/db/types";

export type FulfillmentResult =
  | { success: true; cjOrderId: string; order: OrderWithItems }
  | { success: false; error: string; details?: unknown };

/**
 * Validates and submits an order to CJ Dropshipping for fulfillment.
 */
export async function fulfillOrderWithCJ(orderId: string): Promise<FulfillmentResult> {
  const order = await getOrderById(orderId);

  if (!order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  if (order.cj_order_id) {
    return {
      success: false,
      error: `Order ${orderId} has already been submitted to CJ Dropshipping (CJ Order ID: ${order.cj_order_id})`,
    };
  }

  // 1. Fetch product records to get cj_product_id for each item
  const supabase = createAdminSupabaseClient();
  const productIds = order.order_items.map((i) => i.product_id);

  let productsData: any[] | null = null;
  try {
    const res = await supabase
      .from("products")
      .select("id, cj_product_id, title")
      .in("id", productIds);
    productsData = res.data;
  } catch {
    // fallback to local catalog
  }

  const productMap = new Map((productsData || []).map((p: any) => [p.id, p]));
  const allCatalogProducts = await getProducts();
  const localProductMap = new Map(allCatalogProducts.map((p) => [p.id, p]));

  const supplierItems = order.order_items.map((item) => {
    const dbP = productMap.get(item.product_id);
    const localP = localProductMap.get(item.product_id);
    const cjPid = dbP?.cj_product_id || localP?.cj_product_id || (item.product_id.startsWith("cj-") ? item.product_id.replace("cj-", "") : item.product_id);

    return {
      supplierProductId: cjPid,
      supplierVariantId: item.variant_id || undefined,
      quantity: item.quantity,
      title: item.product_title,
    };
  });

  // 2. Validate Stock & Product Availability with CJ
  console.info(`[fulfillment] Validating CJ stock for order ${orderId}...`);
  const stockResult = await cjDropshipping.validateStock(supplierItems);

  if (!stockResult.valid) {
    const failedItem = stockResult.itemResults.find((i) => !i.available);
    const reason = failedItem?.reason || "Product stock validation failed with CJ Dropshipping";
    console.warn(`[fulfillment] CJ stock validation failed for order ${orderId}: ${reason}`);
    return { success: false, error: reason, details: stockResult.itemResults };
  }

  // 3. Validate Shipping Destination
  const destResult = await cjDropshipping.validateShippingDestination(
    order.shipping_address.country,
    order.shipping_address.postal_code
  );

  if (!destResult.valid) {
    return {
      success: false,
      error: destResult.reason || `Shipping to ${order.shipping_address.country} not supported by CJ Dropshipping.`,
    };
  }

  // 4. Submit Order to CJ Dropshipping API
  const cjResult = await cjDropshipping.createOrder({
    orderId: order.id,
    customerName: `${order.customer_first_name} ${order.customer_last_name}`,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone || undefined,
    shippingAddress: order.shipping_address,
    items: supplierItems,
  });

  if (!cjResult.success || !cjResult.supplierOrderId) {
    const errorMsg = cjResult.error || "Failed to create order on CJ Dropshipping API.";
    await notifyAdmin({
      type: "cj_failed",
      title: "CJ Fulfillment Submission Failed",
      message: `Order #${order.id.slice(0, 8)} failed during CJ submission: ${errorMsg}`,
      metadata: { orderId: order.id, customerEmail: order.customer_email, error: errorMsg },
    });
    return {
      success: false,
      error: errorMsg,
    };
  }

  const cjOrderId = cjResult.supplierOrderId;

  // 5. Automatically Pay CJ Order using CJ Account Balance
  console.info(`[fulfillment] Automatically paying CJ Order ${cjOrderId} using CJ account balance...`);
  const paymentResult = await cjDropshipping.payOrderWithBalance(cjOrderId);

  const now = new Date().toISOString();
  const fulfillmentStatus = paymentResult.success ? "processing" : "manual_payment_required";
  const statusNote = paymentResult.success
    ? `Submitted and paid via CJ Account Balance. CJ Order ID: ${cjOrderId}`
    : `CJ Order created (${cjOrderId}), but CJ balance payment failed: ${paymentResult.message || "Insufficient balance"}. Manual payment required in CJ Portal.`;

  if (!paymentResult.success) {
    console.warn(`[fulfillment] CJ balance payment notice for order ${order.id} (CJ ID ${cjOrderId}): ${paymentResult.message}`);
    await notifyAdmin({
      type: "cj_failed",
      title: "CJ Balance Payment Failed",
      message: `Order #${order.id.slice(0, 8)} created at CJ (${cjOrderId}), but balance payment failed: ${paymentResult.message || "Check CJ Wallet Balance"}. Manual payment required in CJ Portal.`,
      metadata: { orderId: order.id, cjOrderId, customerEmail: order.customer_email, error: paymentResult.message },
    });
  }

  // 6. Update Order in Supabase Database / Local Repository
  try {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        cj_order_id: cjOrderId,
        fulfillment_ref: cjOrderId,
        fulfillment_status: fulfillmentStatus,
        synced_at: now,
        status: "processing",
      })
      .eq("id", order.id);

    if (updateError) {
      console.warn(`[fulfillment] DB update notice for order ${order.id}:`, updateError.message);
    }
  } catch (dbErr) {
    console.warn(`[fulfillment] Supabase order update notice:`, dbErr);
  }

  // Always update local repository snapshot
  const updatedLocalOrder: OrderWithItems = {
    ...order,
    cj_order_id: cjOrderId,
    fulfillment_ref: cjOrderId,
    fulfillment_status: fulfillmentStatus as any,
    status: "processing",
    synced_at: now,
    updated_at: now,
  };
  saveLocalOrder(updatedLocalOrder);

  // Record Timeline Status Entry (Optional DB Log)
  try {
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.status,
      new_status: "processing",
      note: statusNote,
      changed_by: "cj_dropshipping_system",
    });
  } catch {
    // optional timeline log
  }

  const refreshedOrder = await getOrderById(order.id);

  console.info(`[fulfillment] Successfully processed CJ order ${order.id} (CJ ID: ${cjOrderId}, Paid: ${paymentResult.success})`);
  return {
    success: true,
    cjOrderId,
    order: refreshedOrder!,
  };
}

/**
 * Synchronizes tracking number, carrier, and shipment status from CJ Dropshipping.
 */
export async function syncOrderTrackingFromCJ(orderId: string) {
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!order.cj_order_id) {
    throw new Error(`Order ${orderId} has no CJ Order ID assigned.`);
  }

  console.info(`[fulfillment] Syncing CJ tracking info for order ${orderId} (CJ ID: ${order.cj_order_id})...`);
  const trackingInfo = await cjDropshipping.getTrackingInfo(order.cj_order_id);

  const supabase = createAdminSupabaseClient();
  const updates: Record<string, unknown> = {
    fulfillment_status: trackingInfo.status || "processing",
    synced_at: new Date().toISOString(),
  };

  if (trackingInfo.trackingNumber) {
    updates.tracking_number = trackingInfo.trackingNumber;
  }
  if (trackingInfo.carrier) {
    updates.shipping_carrier = trackingInfo.carrier;
  }

  let targetOrderStatus = order.status;
  if (trackingInfo.trackingNumber && order.status !== "delivered") {
    updates.status = "shipped";
    targetOrderStatus = "shipped";
  }

  await supabase.from("orders").update(updates).eq("id", order.id);

  if (targetOrderStatus !== order.status) {
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.status,
      new_status: targetOrderStatus,
      note: `Tracking updated from CJ: ${trackingInfo.carrier} - ${trackingInfo.trackingNumber}`,
      changed_by: "cj_tracking_sync",
    });
  }

  const refreshed = await getOrderById(order.id);
  return {
    success: true,
    trackingInfo,
    order: refreshed!,
  };
}

/**
 * Validates and submits an order to Printful for fulfillment.
 */
export async function fulfillOrderWithPrintful(orderId: string): Promise<FulfillmentResult> {
  const order = await getOrderById(orderId);

  if (!order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  if (order.fulfillment_ref) {
    return {
      success: false,
      error: `Order ${orderId} has already been submitted for fulfillment (Ref: ${order.fulfillment_ref})`,
    };
  }

  const { printfulService } = await import("@/lib/printful/service");

  try {
    const printfulOrder = await printfulService.createOrder(
      {
        external_id: order.id,
        recipient: {
          name: `${order.customer_first_name} ${order.customer_last_name}`,
          email: order.customer_email,
          phone: order.customer_phone || undefined,
          address1: order.shipping_address.address_line1,
          address2: order.shipping_address.address_line2 || undefined,
          city: order.shipping_address.city,
          state_code: order.shipping_address.state,
          country_code: order.shipping_address.country.substring(0, 2).toUpperCase(),
          zip: order.shipping_address.postal_code,
        },
        items: order.order_items.map((item) => ({
          sync_variant_id: item.variant_id ? parseInt(item.variant_id, 10) || undefined : undefined,
          quantity: item.quantity,
          name: item.product_title,
          retail_price: String(item.unit_price),
        })),
      },
      true // confirm order
    );

    const supabase = createAdminSupabaseClient();
    await supabase
      .from("orders")
      .update({
        fulfillment_ref: String(printfulOrder.id),
        fulfillment_status: "processing",
        synced_at: new Date().toISOString(),
        status: "processing",
      })
      .eq("id", order.id);

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.status,
      new_status: "processing",
      note: `Submitted to Printful. Printful Order ID: ${printfulOrder.id}`,
      changed_by: "printful_fulfillment_system",
    });

    const refreshedOrder = await getOrderById(order.id);
    return {
      success: true,
      cjOrderId: String(printfulOrder.id),
      order: refreshedOrder!,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Printful order creation failed";
    console.error(`[fulfillment] Printful submission error for order ${orderId}:`, err);
    return { success: false, error: msg };
  }
}

