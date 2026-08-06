/**
 * lib/suppliers/cj/cj.adapter.ts
 *
 * CJ Dropshipping Adapter implementation of ISupplierAdapter interface.
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
  UnifiedShippingRate,
} from "../types/supplier.types";
import { cjDropshipping } from "@/lib/cj-dropshipping";
import { importCJProduct } from "@/lib/cj-import";

export class CJSupplierAdapter implements ISupplierAdapter {
  readonly supplierType: SupplierType = "CJ";
  readonly displayName: string = "CJ Dropshipping";

  async searchProducts(options: UnifiedSearchOptions): Promise<UnifiedSearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const listRes = await cjDropshipping.getProductList({
      pageNum: page,
      pageSize: limit,
      categoryId: options.categoryId,
      keyword: options.keyword,
    });

    const products: UnifiedProductDetail[] = (listRes.list || []).map((p) => ({
      supplierProductId: p.pid,
      supplierType: "CJ",
      title: p.productNameEn || p.productName || "CJ Product",
      description: "",
      category: p.categoryName || null,
      brand: "CJ Dropshipping",
      costPrice: p.sellPrice ? parseFloat(p.sellPrice) : 0,
      suggestedPrice: (p.sellPrice ? parseFloat(p.sellPrice) : 0) * 1.4,
      mainImage: p.productImage || null,
      galleryImages: p.productImage ? [p.productImage] : [],
      variants: [],
      status: "active",
      rawSupplierData: p,
    }));

    return {
      products,
      total: listRes.total || products.length,
      page,
      limit,
      supplierType: "CJ",
    };
  }

  async getProduct(supplierProductId: string): Promise<UnifiedProductDetail | null> {
    const detail = await cjDropshipping.getProductDetail(supplierProductId);
    if (!detail) return null;

    const cost = detail.sellPrice ? parseFloat(detail.sellPrice) : 0;
    return {
      supplierProductId: detail.pid,
      supplierType: "CJ",
      title: detail.productNameEn || detail.productName || "CJ Product",
      description: detail.description || "",
      category: detail.categoryName || null,
      brand: "CJ Dropshipping",
      costPrice: cost,
      suggestedPrice: cost * 1.4,
      mainImage: detail.productImage || null,
      galleryImages: detail.productImage ? [detail.productImage] : [],
      variants: (detail.variants || []).map((v) => ({
        id: v.vid,
        supplierVariantId: v.vid,
        name: v.variantNameEn || v.variantKey || "Variant",
        sku: v.variantSku || "",
        price: (v.variantSellPrice != null ? Number(v.variantSellPrice) : cost) * 1.4,
        costPrice: v.variantSellPrice != null ? Number(v.variantSellPrice) : cost,
        priceDelta: 0,
        stock: v.inventoryNum ?? 999,
        image: v.variantImage || null,
      })),
      status: "active",
      rawSupplierData: detail,
    };
  }

  async getVariants(supplierProductId: string): Promise<UnifiedVariant[]> {
    const prod = await this.getProduct(supplierProductId);
    return prod ? prod.variants : [];
  }

  async importProduct(options: UnifiedImportOptions): Promise<UnifiedImportResult> {
    const report = await importCJProduct({
      pid: options.supplierProductId,
      action: options.action || "import",
    });

    return {
      status: report.status === "imported" ? "imported" : report.status === "already_imported" ? "already_imported" : "error",
      supplierProductId: options.supplierProductId,
      supplierType: "CJ",
      productId: report.product?.id,
      slug: report.product?.slug,
      message: report.message,
      logs: report.logs || [],
      durationMs: report.durationMs || 0,
    };
  }

  async syncProduct(supplierProductId: string): Promise<UnifiedSyncResult> {
    const report = await importCJProduct({
      pid: supplierProductId,
      action: "update",
    });

    return {
      supplierProductId,
      supplierType: "CJ",
      isNew: false,
      isUpdated: report.status === "imported",
      message: report.message,
    };
  }

  async createOrder(orderInput: UnifiedOrderInput): Promise<UnifiedOrderResult> {
    const nameParts = (orderInput.recipient.name || "Customer").trim().split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Guest";

    const result = await cjDropshipping.createOrder({
      orderId: orderInput.orderId,
      customerName: orderInput.recipient.name,
      customerEmail: orderInput.recipient.email,
      customerPhone: orderInput.recipient.phone,
      shippingAddress: {
        first_name: firstName,
        last_name: lastName,
        address_line1: orderInput.recipient.address1,
        address_line2: orderInput.recipient.address2,
        city: orderInput.recipient.city,
        state: orderInput.recipient.state,
        postal_code: orderInput.recipient.zip,
        country: orderInput.recipient.country,
      },
      items: orderInput.items.map((i) => ({
        supplierProductId: i.supplierProductId,
        supplierVariantId: i.supplierVariantId,
        quantity: i.quantity,
        title: i.title,
      })),
    });

    return {
      success: result.success,
      supplierOrderId: result.supplierOrderId || "",
      supplierType: "CJ",
      message: result.error ? `CJ Order Failed: ${result.error}` : "Order submitted to CJ Dropshipping",
      status: result.success ? "confirmed" : "failed",
    };
  }

  async trackOrder(supplierOrderId: string): Promise<UnifiedTrackingResult> {
    const tracking = await cjDropshipping.getTrackingInfo(supplierOrderId);

    return {
      orderId: supplierOrderId,
      supplierType: "CJ",
      supplierOrderId,
      status: tracking?.trackingNumber ? "shipped" : "processing",
      carrier: tracking?.carrier || "CJ Logistics",
      trackingNumber: tracking?.trackingNumber || undefined,
    };
  }

  async calculateShipping(input: UnifiedShippingInput): Promise<UnifiedShippingResult> {
    if (!input.items.length) {
      return { success: false, rates: [], supplierType: "CJ", error: "No items provided for shipping estimate." };
    }

    const firstVid = input.items[0].supplierVariantId;
    const rates = await cjDropshipping.getShippingInfo({
      endCountryCode: input.recipient.country.substring(0, 2).toUpperCase(),
      vid: firstVid,
      quantity: input.items[0].quantity,
    });

    const unifiedRates: UnifiedShippingRate[] = rates.map((r, i) => {
      const aging = r.logisticAging || "7-15";
      const parts = aging.split("-");
      return {
        id: `cj-ship-${i}`,
        name: r.logisticName || "CJ Shipping",
        rate: r.logisticPrice ?? 0,
        currency: "USD",
        minDeliveryDays: parseInt(parts[0], 10) || 7,
        maxDeliveryDays: parseInt(parts[1], 10) || 15,
      };
    });

    return {
      success: true,
      rates: unifiedRates,
      supplierType: "CJ",
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await cjDropshipping.testConnection();
      return {
        ok: res.success,
        message: res.message,
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      };
    }
  }
}
