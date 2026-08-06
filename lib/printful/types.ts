/**
 * lib/printful/types.ts
 *
 * Production TypeScript definitions for Printful API v1/v2 endpoints, entities,
 * webhooks, requests, and responses.
 */

export interface PrintfulPaging {
  total: number;
  offset: number;
  limit: number;
}

export interface PrintfulApiResponse<T = unknown> {
  code: number;
  result: T;
  error?: {
    reason: string;
    message: string;
  };
  paging?: PrintfulPaging;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------
export interface PrintfulStoreInfo {
  id: number;
  name: string;
  type: string;
  website: string;
  created: number;
  currency: string;
}

// -----------------------------------------------------------------------------
// Catalog & Categories
// -----------------------------------------------------------------------------
export interface PrintfulCatalogOption {
  id: string;
  title: string;
  type: string;
  values: Record<string, string>;
  additional_price?: string;
}

export interface PrintfulCatalogCategory {
  id: number;
  parent_id: number;
  title: string;
  image_url: string;
  catalog_position: number;
}

export interface PrintfulCatalogProduct {
  id: number;
  main_category_id: number;
  type: string;
  type_name: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  image: string;
  variant_count: number;
  currency: string;
  is_discontinued?: boolean;
  description?: string;
}

export interface PrintfulCatalogVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  currency: string;
  price: string;
  in_stock: boolean;
  color?: string | null;
  size?: string | null;
  image?: string | null;
  color_code?: string | null;
}

// -----------------------------------------------------------------------------
// Sync Products (Store Products)
// -----------------------------------------------------------------------------
export interface PrintfulSyncVariant {
  id: number;
  external_id: string | null;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number; // Catalog variant ID
  retail_price: string;
  currency: string;
  sku: string;
  product: PrintfulCatalogProduct;
  files: PrintfulFile[];
  options: Array<{ id: string; value: unknown }>;
  is_ignored: boolean;
  color?: string | null;
  size?: string | null;
  availability_status?: string | null;
}

export interface PrintfulSyncProduct {
  id: number;
  external_id: string | null;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
  product_id?: number | string;
  status?: string;
  created?: number;
  updated?: number;
}

export interface PrintfulSyncProductDetail {
  sync_product: PrintfulSyncProduct;
  sync_variants: PrintfulSyncVariant[];
}

// -----------------------------------------------------------------------------
// Files & Mockup Generator
// -----------------------------------------------------------------------------
export interface PrintfulFile {
  id?: number;
  type: string; // e.g. "front", "back", "preview"
  url?: string;
  preview_url?: string;
  filename?: string;
  visible?: boolean;
  status?: string;
  created?: number;
}

export interface PrintfulMockupFileOption {
  placement: string;
  image_url: string;
}

export interface PrintfulMockupTaskInput {
  variant_ids: number[];
  format?: "jpg" | "png";
  files: PrintfulMockupFileOption[];
}

export interface PrintfulMockupTask {
  task_key: string;
  status: "pending" | "completed" | "failed";
  error?: string;
}

export interface PrintfulMockupItem {
  placement: string;
  mockup_url: string;
  variant_ids: number[];
  extra_mockups?: Array<{
    title: string;
    url: string;
  }>;
}

export interface PrintfulMockupResult {
  task_key: string;
  status: "pending" | "completed" | "failed";
  mockups: PrintfulMockupItem[];
}

// -----------------------------------------------------------------------------
// Orders & Shipping
// -----------------------------------------------------------------------------
export interface PrintfulRecipient {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  state_name?: string;
  country_code: string;
  country_name?: string;
  zip: string;
  phone?: string;
  email: string;
}

export interface PrintfulOrderItemInput {
  sync_variant_id?: number;
  variant_id?: number;
  external_variant_id?: string;
  quantity: number;
  price?: string;
  retail_price?: string;
  name?: string;
  files?: PrintfulFile[];
}

export interface PrintfulOrderInput {
  external_id?: string;
  shipping?: string; // e.g. "STANDARD", "EXPRESS"
  recipient: PrintfulRecipient;
  items: PrintfulOrderItemInput[];
  retail_costs?: {
    currency?: string;
    subtotal?: string;
    discount?: string;
    shipping?: string;
    tax?: string;
  };
  notes?: string;
}

export interface PrintfulOrderItem {
  id: number;
  external_id: string | null;
  variant_id: number;
  sync_variant_id: number;
  quantity: number;
  price: string;
  retail_price: string;
  name: string;
  sku: string;
  files: PrintfulFile[];
}

export interface PrintfulOrderShipment {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  created: number;
  ship_date: string;
  shipped_at: number;
  reshipment: boolean;
}

export interface PrintfulOrder {
  id: number;
  external_id: string | null;
  store: number;
  status: "draft" | "failed" | "pending" | "canceled" | "inprocess" | "partial" | "fulfilled";
  shipping: string;
  shipping_service_name: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  shipments: PrintfulOrderShipment[];
  costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    digitization: string;
    additional_fee: string;
    fulfillment_fee: string;
    tax: string;
    vat: string;
    total: string;
  };
  retail_costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    vat: string;
    total: string;
  };
}

export interface PrintfulShippingRateInput {
  recipient: PrintfulRecipient;
  items: Array<{
    variant_id?: number;
    sync_variant_id?: number;
    quantity: number;
    value?: string;
  }>;
  currency?: string;
}

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  minDeliveryDate?: string;
  maxDeliveryDate?: string;
}

// -----------------------------------------------------------------------------
// Warehouse
// -----------------------------------------------------------------------------
export interface PrintfulWarehouseProduct {
  id: number;
  name: string;
  sku: string;
  status: string;
  retail_price: string;
  quantity: number;
}

export interface PrintfulWarehouseLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
}

// -----------------------------------------------------------------------------
// Webhook
// -----------------------------------------------------------------------------
export interface PrintfulWebhookPayload<T = unknown> {
  type: string;
  created: number;
  retries: number;
  store: number;
  data: T;
}
