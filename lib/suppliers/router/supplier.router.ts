/**
 * lib/suppliers/router/supplier.router.ts
 *
 * Production Unified Supplier Router.
 * Automatically delegates operations to the registered ISupplierAdapter based on supplierType.
 */

import type { ISupplierAdapter } from "../interfaces/supplier.interface";
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
import { CJSupplierAdapter } from "../cj/cj.adapter";
import { PrintfulSupplierAdapter } from "../printful/printful.adapter";
import { recordUnifiedLog } from "@/lib/logging/unified-logger";

export class SupplierRouter {
  private adapters: Map<SupplierType, ISupplierAdapter> = new Map();

  constructor() {
    this.registerAdapter(new CJSupplierAdapter());
    this.registerAdapter(new PrintfulSupplierAdapter());
  }

  /** Register a new supplier adapter dynamically */
  registerAdapter(adapter: ISupplierAdapter): void {
    this.adapters.set(adapter.supplierType, adapter);
    console.info(`[supplier-router] Registered supplier adapter for: ${adapter.supplierType} ("${adapter.displayName}")`);
  }

  /** Retrieve adapter for a given supplierType */
  getAdapter(supplierType: SupplierType): ISupplierAdapter {
    const adapter = this.adapters.get(supplierType);
    if (!adapter) {
      throw new Error(`[supplier-router] Unsupported supplier type: "${supplierType}". Ensure adapter is registered.`);
    }
    return adapter;
  }

  /** Check if adapter is registered for a supplierType */
  hasAdapter(supplierType: SupplierType): boolean {
    return this.adapters.has(supplierType);
  }

  /** Unified catalog search */
  async searchProducts(supplierType: SupplierType, options: UnifiedSearchOptions): Promise<UnifiedSearchResult> {
    const adapter = this.getAdapter(supplierType);
    recordUnifiedLog("api", "supplier_search", `Searching catalog on ${adapter.displayName}`, { supplier: supplierType === "PRINTFUL" ? "PRINTFUL" : supplierType === "CJ" ? "CJ" : "SYSTEM", metadata: { options } });
    return adapter.searchProducts(options);
  }

  /** Unified single product detail query */
  async getProduct(supplierType: SupplierType, supplierProductId: string): Promise<UnifiedProductDetail | null> {
    const adapter = this.getAdapter(supplierType);
    return adapter.getProduct(supplierProductId);
  }

  /** Unified variant query */
  async getVariants(supplierType: SupplierType, supplierProductId: string): Promise<UnifiedVariant[]> {
    const adapter = this.getAdapter(supplierType);
    return adapter.getVariants(supplierProductId);
  }

  /** Unified product import */
  async importProduct(supplierType: SupplierType, options: UnifiedImportOptions): Promise<UnifiedImportResult> {
    const adapter = this.getAdapter(supplierType);
    recordUnifiedLog("import", `import_${supplierType.toLowerCase()}`, `Importing product ${options.supplierProductId} via ${adapter.displayName}`, { supplier: supplierType === "PRINTFUL" ? "PRINTFUL" : supplierType === "CJ" ? "CJ" : "SYSTEM", metadata: { options } });
    return adapter.importProduct(options);
  }

  /** Unified product sync */
  async syncProduct(supplierType: SupplierType, supplierProductId: string): Promise<UnifiedSyncResult> {
    const adapter = this.getAdapter(supplierType);
    recordUnifiedLog("sync", `sync_${supplierType.toLowerCase()}`, `Syncing product ${supplierProductId} via ${adapter.displayName}`, { supplier: supplierType === "PRINTFUL" ? "PRINTFUL" : supplierType === "CJ" ? "CJ" : "SYSTEM" });
    return adapter.syncProduct(supplierProductId);
  }

  /** Unified order creation */
  async createOrder(orderInput: UnifiedOrderInput): Promise<UnifiedOrderResult> {
    const adapter = this.getAdapter(orderInput.supplierType);
    recordUnifiedLog("order", `create_order_${orderInput.supplierType.toLowerCase()}`, `Submitting order #${orderInput.orderId} to ${adapter.displayName}`, { supplier: orderInput.supplierType === "PRINTFUL" ? "PRINTFUL" : orderInput.supplierType === "CJ" ? "CJ" : "SYSTEM", metadata: { orderInput } });
    return adapter.createOrder(orderInput);
  }

  /** Unified tracking query */
  async trackOrder(supplierType: SupplierType, supplierOrderId: string): Promise<UnifiedTrackingResult> {
    const adapter = this.getAdapter(supplierType);
    return adapter.trackOrder(supplierOrderId);
  }

  /** Unified shipping rate calculation */
  async calculateShipping(supplierType: SupplierType, input: UnifiedShippingInput): Promise<UnifiedShippingResult> {
    const adapter = this.getAdapter(supplierType);
    return adapter.calculateShipping(input);
  }

  /** Health checks across all registered supplier adapters */
  async healthCheckAll(): Promise<Record<SupplierType, { ok: boolean; message: string; latencyMs: number }>> {
    const results: Partial<Record<SupplierType, { ok: boolean; message: string; latencyMs: number }>> = {};
    for (const [type, adapter] of this.adapters.entries()) {
      results[type] = await adapter.healthCheck();
    }
    return results as Record<SupplierType, { ok: boolean; message: string; latencyMs: number }>;
  }
}

export const supplierRouter = new SupplierRouter();
