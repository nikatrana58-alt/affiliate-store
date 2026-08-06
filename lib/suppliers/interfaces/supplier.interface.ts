/**
 * lib/suppliers/interfaces/supplier.interface.ts
 *
 * Production Standard ISupplierAdapter Contract.
 * Every supplier implementation (CJ, Printful, Printify, Amazon, Manual) MUST implement this interface.
 */

import type {
  SupplierType,
  UnifiedSearchOptions,
  UnifiedSearchResult,
  UnifiedProductDetail,
  UnifiedVariant,
  UnifiedImportOptions,
  UnifiedImportResult,
  UnifiedSyncResult,
  UnifiedOrderInput,
  UnifiedOrderResult,
  UnifiedTrackingResult,
  UnifiedShippingInput,
  UnifiedShippingResult,
} from "../types/supplier.types";

export interface ISupplierAdapter {
  readonly supplierType: SupplierType;
  readonly displayName: string;

  /** Search supplier catalog for products */
  searchProducts(options: UnifiedSearchOptions): Promise<UnifiedSearchResult>;

  /** Fetch single supplier product details */
  getProduct(supplierProductId: string): Promise<UnifiedProductDetail | null>;

  /** Fetch variants for a supplier product */
  getVariants(supplierProductId: string): Promise<UnifiedVariant[]>;

  /** Import or update supplier product into local store catalog */
  importProduct(options: UnifiedImportOptions): Promise<UnifiedImportResult>;

  /** Synchronize product status, stock, and pricing from upstream supplier */
  syncProduct(supplierProductId: string): Promise<UnifiedSyncResult>;

  /** Submit an order to supplier for fulfillment */
  createOrder(orderInput: UnifiedOrderInput): Promise<UnifiedOrderResult>;

  /** Fetch latest tracking status from supplier */
  trackOrder(supplierOrderId: string): Promise<UnifiedTrackingResult>;

  /** Estimate shipping rates from supplier */
  calculateShipping(input: UnifiedShippingInput): Promise<UnifiedShippingResult>;

  /** Perform live health & connection check */
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>;
}
