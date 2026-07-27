/**
 * lib/db/types.ts
 *
 * Canonical TypeScript types for every ecommerce table.
 * These mirror the Supabase PostgreSQL schema exactly.
 * Re-exported from individual lib/* modules for convenience.
 */

// ─── Shared ──────────────────────────────────────────────────────────────────

/** ISO 8601 timestamp string as returned by Supabase */
export type ISOTimestamp = string;

// ─── Addresses ───────────────────────────────────────────────────────────────

export type Address = {
  id: string;
  customer_email: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  is_default_billing?: boolean;
  address_type?: "shipping" | "billing" | "both";
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

export type AddressInput = Omit<Address, "id" | "created_at" | "updated_at">;

// ─── Customer Dashboard Types ────────────────────────────────────────────────

export type WishlistItem = {
  id: string;
  customer_email: string;
  product_id: string;
  created_at: ISOTimestamp;
};

export type CustomerNotification = {
  id: string;
  customer_email: string;
  type: "order_update" | "shipping" | "promo" | "system";
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: ISOTimestamp;
};

export type CustomerSettings = {
  id: string;
  customer_email: string;
  email_order_updates: boolean;
  email_promotions: boolean;
  sms_updates: boolean;
  two_factor_enabled: boolean;
  two_factor_secret?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

/** Snapshot stored inside orders.shipping_address / billing_address (JSONB) */
export type AddressSnapshot = {
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string | null;
};

// ─── Coupons ─────────────────────────────────────────────────────────────────

export type CouponDiscountType = "percentage" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  minimum_order: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed";

export type ShippingMethod = "standard" | "express" | "overnight";

export type Order = {
  id: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string | null;
  shipping_address: AddressSnapshot;
  billing_address: AddressSnapshot | null;
  shipping_method: ShippingMethod;
  shipping_cost: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  status: OrderStatus;
  stripe_session_id: string | null;
  fulfillment_ref: string | null;
  cj_order_id: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  fulfillment_status: string;
  synced_at: ISOTimestamp | null;
  estimated_delivery: ISOTimestamp | null;
  shipped_at: ISOTimestamp | null;
  delivered_at: ISOTimestamp | null;
  last_tracking_sync: ISOTimestamp | null;
  tracking_url: string | null;
  notes: string | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export type GetOrdersOptions = {
  limit?: number;
  offset?: number;
  status?: OrderStatus | "all";
  search?: string;
  dateFilter?: "all" | "today" | "week" | "month";
  sortOrder?: "newest" | "oldest";
};

export type OrderStats = {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
};

/** Payload accepted by POST /api/orders */
export type CreateOrderInput = {
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string;
  shipping_address: AddressSnapshot;
  billing_address?: AddressSnapshot | null;
  shipping_method: ShippingMethod;
  coupon_code?: string;
  items: CreateOrderItemInput[];
};

// ─── Order Items ─────────────────────────────────────────────────────────────

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  product_slug: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number; // generated column
  created_at: ISOTimestamp;
};

export type CreateOrderItemInput = {
  product_id: string;
  product_title: string;
  product_image?: string | null;
  product_slug: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
};

// ─── Order Status History ─────────────────────────────────────────────────────

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note: string | null;
  changed_by: string;
  created_at: ISOTimestamp;
};

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentGateway = "manual" | "stripe" | "paypal" | "other";
export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type Payment = {
  id: string;
  order_id: string;
  gateway: PaymentGateway;
  gateway_payment_id: string | null;
  gateway_status: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at: ISOTimestamp | null;
  refunded_at: ISOTimestamp | null;
  metadata: Record<string, unknown> | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

// ─── Stripe Tables ───────────────────────────────────────────────────────────

export type StripeCustomer = {
  id: string;
  customer_email: string;
  stripe_customer_id: string;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

export type StripeEvent = {
  id: string;
  type: string;
  processed_at: ISOTimestamp;
};

// ─── Product Variants ────────────────────────────────────────────────────────

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_delta: number;
  is_active: boolean;
  sort_order: number;
  attributes: Record<string, string> | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

// ─── Inventory ───────────────────────────────────────────────────────────────

export type Inventory = {
  id: string;
  product_id: string;
  variant_id: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  allow_backorder: boolean;
  low_stock_threshold: number;
  updated_at: ISOTimestamp;
};

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export type InventoryWithStatus = Inventory & {
  available_quantity: number;
  status: InventoryStatus;
};

// ─── Column Selectors ────────────────────────────────────────────────────────

export const ORDER_COLUMNS =
  "id,customer_email,customer_first_name,customer_last_name,customer_phone," +
  "shipping_address,billing_address,shipping_method,shipping_cost," +
  "subtotal,discount_amount,tax_amount,grand_total," +
  "coupon_id,coupon_code,status,stripe_session_id,fulfillment_ref," +
  "cj_order_id,tracking_number,shipping_carrier,fulfillment_status,synced_at," +
  "estimated_delivery,shipped_at,delivered_at,last_tracking_sync,tracking_url," +
  "notes,created_at,updated_at";


export const ORDER_ITEM_COLUMNS =
  "id,order_id,product_id,product_title,product_image,product_slug," +
  "variant_id,quantity,unit_price,total_price,created_at";

export const ADDRESS_COLUMNS =
  "id,customer_email,first_name,last_name,address_line1,address_line2," +
  "city,state,postal_code,country,phone,is_default,created_at,updated_at";

export const COUPON_COLUMNS =
  "id,code,description,discount_type,discount_value,minimum_order," +
  "max_uses,uses_count,is_active,expires_at,created_at,updated_at";

export const INVENTORY_COLUMNS =
  "id,product_id,variant_id,stock_quantity,reserved_quantity," +
  "allow_backorder,low_stock_threshold,updated_at";
