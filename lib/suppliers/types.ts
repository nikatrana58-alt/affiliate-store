/**
 * lib/suppliers/types.ts
 *
 * Supplier abstraction types for multi-supplier fulfillment integration
 * (CJ Dropshipping, AliExpress, Spocket, etc.).
 */

export type ValidateStockItem = {
  supplierProductId: string;
  supplierVariantId?: string;
  quantity: number;
};

export type StockValidationItemResult = {
  supplierProductId: string;
  available: boolean;
  stockQuantity: number;
  requestedQuantity: number;
  reason?: string;
};

export type StockValidationResult = {
  valid: boolean;
  itemResults: StockValidationItemResult[];
};

export type ShippingValidationResult = {
  valid: boolean;
  supported: boolean;
  estimatedFee?: number;
  estimatedDays?: string;
  reason?: string;
};

export type CreateSupplierOrderParams = {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  shippingMethod?: string;
  shippingAddress: {
    first_name: string;
    last_name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: Array<{
    supplierProductId: string;
    supplierVariantId?: string;
    quantity: number;
    title: string;
  }>;
};

export type SupplierOrderResult = {
  success: boolean;
  supplierOrderId?: string;
  status?: string;
  rawResponse?: unknown;
  error?: string;
};

export type SupplierTrackingInfo = {
  supplierOrderId: string;
  trackingNumber?: string;
  carrier?: string;
  status: string; // "unfulfilled" | "processing" | "shipped" | "in_transit" | "delivered"
  shippedAt?: string;
  rawResponse?: unknown;
};
