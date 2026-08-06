/**
 * lib/printful/constants.ts
 *
 * Production-grade Printful API constants, endpoints, timeouts, and configuration defaults.
 */

export const PRINTFUL_API_BASE_URL = "https://api.printful.com";

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_INITIAL_RETRY_DELAY_MS = 1_000;

export const PRINTFUL_ENDPOINTS = {
  STORE: "/store",
  STORES: "/stores",
  PRODUCTS: "/products",
  SYNC_PRODUCTS: "/sync/products",
  SYNC_PRODUCT: (id: string | number) => `/sync/products/${id}`,
  CATALOG_PRODUCT: (id: string | number) => `/products/${id}`,
  CATALOG_VARIANT: (id: string | number) => `/products/variant/${id}`,
  FILES: "/files",
  MOCKUP_CREATE: (productId: string | number) => `/mockup-generator/create-task/${productId}`,
  MOCKUP_TASK: "/mockup-generator/task",
  ORDERS: "/orders",
  ORDER_DETAIL: (id: string | number) => `/orders/${id}`,
  ORDER_CANCEL: (id: string | number) => `/orders/${id}`,
  SHIPPING_RATES: "/shipping/rates",
  CATEGORIES: "/categories",
  WAREHOUSE_PRODUCTS: "/warehouse/products",
  WAREHOUSE_LOCATIONS: "/warehouse/locations",
  WEBHOOKS: "/webhooks",
} as const;

export const PRINTFUL_WEBHOOK_EVENTS = {
  ORDER_CREATED: "order_created",
  ORDER_UPDATED: "order_updated",
  ORDER_FAILED: "order_failed",
  ORDER_CANCELED: "order_canceled",
  PACKAGE_SHIPPED: "package_shipped",
  PACKAGE_RETURNED: "package_returned",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  SYNC_PRODUCT_DELETED: "sync_product_deleted",
  STOCK_UPDATED: "stock_updated",
} as const;

export type PrintfulWebhookEventType =
  (typeof PRINTFUL_WEBHOOK_EVENTS)[keyof typeof PRINTFUL_WEBHOOK_EVENTS];

export const PRINTFUL_CDN_DOMAINS = [
  "files.printful.com",
  "printful.s3.amazonaws.com",
  "s3.amazonaws.com",
] as const;
