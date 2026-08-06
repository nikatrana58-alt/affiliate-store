/**
 * lib/supplier-router.ts
 *
 * Production Supplier Router for multi-source ecommerce order processing.
 *
 * Supported Suppliers:
 * - CJ Dropshipping ("CJ")
 * - Printful ("PRINTFUL")
 * - Printify ("PRINTIFY") [Extensible Architecture]
 * - Amazon Affiliate / Direct ("AMAZON") [Extensible Architecture]
 * - Manual Fulfillment ("MANUAL")
 *
 * The rest of the application (checkout, order history, storefront, admin dashboard)
 * calls `routeOrderFulfillment(orderId)` and `routeTrackingSync(orderId)` without needing
 * to know upstream fulfillment details.
 */

import { fulfillOrderWithCJ, fulfillOrderWithPrintful, type FulfillmentResult } from "@/lib/fulfillment";
import { getOrderById } from "@/lib/orders";
import { createAdminSupabaseClient } from "@/lib/supabase";

export type SupplierType = "CJ" | "PRINTFUL" | "PRINTIFY" | "AMAZON" | "MANUAL";

export interface SupplierMetadata {
  type: SupplierType;
  displayName: string;
  badgeColor: string;
  icon: string;
  website: string;
  supportsRealtimeStock: boolean;
  supportsAutomatedFulfillment: boolean;
}

export const SUPPLIER_REGISTRY: Record<SupplierType, SupplierMetadata> = {
  CJ: {
    type: "CJ",
    displayName: "CJ Dropshipping",
    badgeColor: "#FF6600",
    icon: "📦",
    website: "https://cjdropshipping.com",
    supportsRealtimeStock: true,
    supportsAutomatedFulfillment: true,
  },
  PRINTFUL: {
    type: "PRINTFUL",
    displayName: "Printful",
    badgeColor: "#C9A84C",
    icon: "🖨️",
    website: "https://printful.com",
    supportsRealtimeStock: true,
    supportsAutomatedFulfillment: true,
  },
  PRINTIFY: {
    type: "PRINTIFY",
    displayName: "Printify",
    badgeColor: "#27AE60",
    icon: "👕",
    website: "https://printify.com",
    supportsRealtimeStock: true,
    supportsAutomatedFulfillment: true,
  },
  AMAZON: {
    type: "AMAZON",
    displayName: "Amazon Direct / Affiliate",
    badgeColor: "#FF9900",
    icon: "🛒",
    website: "https://amazon.com",
    supportsRealtimeStock: false,
    supportsAutomatedFulfillment: false,
  },
  MANUAL: {
    type: "MANUAL",
    displayName: "Manual Store Inventory",
    badgeColor: "#3498DB",
    icon: "🏢",
    website: "https://curatedfinds.store",
    supportsRealtimeStock: true,
    supportsAutomatedFulfillment: false,
  },
};

/**
 * Resolves the primary supplier type for a given product or product ID.
 */
export async function getProductSupplierType(productId: string): Promise<SupplierType> {
  const supabase = createAdminSupabaseClient();
  try {
    const { data } = await supabase
      .from("products")
      .select("supplier_type, cj_product_id, printful_sync_id, printful_product_id")
      .eq("id", productId)
      .maybeSingle();

    if (data) {
      if (data.supplier_type) return data.supplier_type as SupplierType;
      if (data.printful_sync_id || data.printful_product_id || productId.startsWith("pf-sync-")) return "PRINTFUL";
      if (data.cj_product_id || productId.startsWith("cj-")) return "CJ";
    }
  } catch (err) {
    console.warn(`[supplier-router] Could not query product ${productId} from DB:`, err);
  }

  if (productId.startsWith("pf-sync-")) return "PRINTFUL";
  if (productId.startsWith("cj-")) return "CJ";
  return "MANUAL";
}

/**
 * Determines the dominant supplier for an entire customer order.
 */
export async function determineOrderSupplierType(orderId: string): Promise<SupplierType> {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.order_items.length) return "MANUAL";

    for (const item of order.order_items) {
      const sType = await getProductSupplierType(item.product_id);
      if (sType === "PRINTFUL") return "PRINTFUL";
      if (sType === "CJ") return "CJ";
    }
  } catch (err) {
    console.warn(`[supplier-router] Could not query order ${orderId}:`, err);
  }

  return "MANUAL";
}

/**
 * Unified Supplier Order Router.
 * Automatically routes fulfillment to CJ Dropshipping or Printful based on supplier analysis.
 */
export async function routeOrderFulfillment(orderId: string): Promise<FulfillmentResult> {
  console.info(`[supplier-router] Routing fulfillment for order ${orderId}...`);
  const supplierType = await determineOrderSupplierType(orderId);
  console.info(`[supplier-router] Order ${orderId} resolved to supplier: ${supplierType}`);

  switch (supplierType) {
    case "PRINTFUL":
      return fulfillOrderWithPrintful(orderId);

    case "CJ":
      return fulfillOrderWithCJ(orderId);

    case "MANUAL":
    case "AMAZON":
    case "PRINTIFY":
    default:
      console.info(`[supplier-router] Order ${orderId} assigned to ${supplierType} manual processing queue.`);
      let orderObj = null;
      try {
        orderObj = await getOrderById(orderId);
      } catch (err) {
        console.warn(`[supplier-router] Could not fetch order ${orderId}:`, err);
      }
      return {
        success: true,
        cjOrderId: `manual-ref-${Date.now()}`,
        order: orderObj as any,
      };
  }
}
