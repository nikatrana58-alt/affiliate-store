/**
 * lib/suppliers/types/supplier.types.ts
 *
 * Production Multi-Supplier Core Types & Interfaces.
 */

export type SupplierType = "CJ" | "PRINTFUL" | "PRINTIFY" | "AMAZON" | "MANUAL" | "DIGITAL";

export interface UnifiedVariant {
  id: string;
  supplierVariantId: string;
  name: string;
  sku: string;
  color?: string | null;
  size?: string | null;
  price: number;
  costPrice: number;
  priceDelta: number;
  stock: number;
  image?: string | null;
  attributes?: Record<string, string>;
}

export interface UnifiedProductDetail {
  supplierProductId: string;
  supplierType: SupplierType;
  title: string;
  description: string;
  category: string | null;
  brand: string | null;
  costPrice: number;
  suggestedPrice: number;
  mainImage: string | null;
  galleryImages: string[];
  variants: UnifiedVariant[];
  status: "active" | "draft" | "delisted";
  rawSupplierData?: unknown;
}

export interface UnifiedSearchOptions {
  keyword?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface UnifiedSearchResult {
  products: UnifiedProductDetail[];
  total: number;
  page: number;
  limit: number;
  supplierType: SupplierType;
}

export interface UnifiedImportOptions {
  supplierProductId: string;
  action?: "import" | "update" | "duplicate";
  markupPercent?: number;
  customCategory?: string;
}

export interface UnifiedImportResult {
  status: "imported" | "already_imported" | "error";
  supplierProductId: string;
  supplierType: SupplierType;
  productId?: string;
  slug?: string;
  message: string;
  logs: string[];
  durationMs: number;
}

export interface UnifiedSyncResult {
  supplierProductId: string;
  supplierType: SupplierType;
  isNew: boolean;
  isUpdated: boolean;
  message: string;
}

export interface UnifiedOrderRecipient {
  name: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface UnifiedOrderItemInput {
  supplierProductId: string;
  supplierVariantId?: string;
  quantity: number;
  price: number;
  title: string;
}

export interface UnifiedOrderInput {
  orderId: string;
  supplierType: SupplierType;
  recipient: UnifiedOrderRecipient;
  items: UnifiedOrderItemInput[];
}

export interface UnifiedOrderResult {
  success: boolean;
  supplierOrderId: string;
  supplierType: SupplierType;
  message: string;
  status: "pending" | "confirmed" | "failed";
}

export interface UnifiedTrackingResult {
  orderId: string;
  supplierType: SupplierType;
  supplierOrderId: string;
  status: "processing" | "shipped" | "delivered" | "failed";
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
}

export interface UnifiedShippingInput {
  supplierType: SupplierType;
  recipient: UnifiedOrderRecipient;
  items: Array<{ supplierVariantId: string; quantity: number }>;
}

export interface UnifiedShippingRate {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export interface UnifiedShippingResult {
  success: boolean;
  rates: UnifiedShippingRate[];
  supplierType: SupplierType;
  error?: string;
}
