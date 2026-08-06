/**
 * lib/suppliers/printful/printful.adapter.ts
 *
 * Printful Adapter implementation of ISupplierAdapter interface.
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
import { printfulService, printfulClient } from "@/lib/printful";
import { importPrintfulProduct } from "@/lib/printful-import";

export class PrintfulSupplierAdapter implements ISupplierAdapter {
  readonly supplierType: SupplierType = "PRINTFUL";
  readonly displayName: string = "Printful";

  async searchProducts(options: UnifiedSearchOptions): Promise<UnifiedSearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const res = await printfulService.getSyncProducts({ limit, offset });
    let items = res.products || [];

    if (options.keyword && options.keyword.trim()) {
      const kw = options.keyword.toLowerCase().trim();
      items = items.filter((p) => p.name.toLowerCase().includes(kw) || String(p.id).includes(kw));
    }

    const products: UnifiedProductDetail[] = items.map((p) => ({
      supplierProductId: String(p.id),
      supplierType: "PRINTFUL",
      title: p.name,
      description: "",
      category: "Apparel & Accessories",
      brand: "Printful",
      costPrice: 20.0,
      suggestedPrice: 28.0,
      mainImage: p.thumbnail_url || null,
      galleryImages: p.thumbnail_url ? [p.thumbnail_url] : [],
      variants: [],
      status: "active",
      rawSupplierData: p,
    }));

    return {
      products,
      total: res.total || products.length,
      page,
      limit,
      supplierType: "PRINTFUL",
    };
  }

  async getProduct(supplierProductId: string): Promise<UnifiedProductDetail | null> {
    const idNum = Number(supplierProductId);
    const detail = await printfulService.getSyncProduct(isNaN(idNum) ? supplierProductId : idNum);
    if (!detail || !detail.sync_product) return null;

    const syncP = detail.sync_product;
    const syncVars = detail.sync_variants || [];
    const mainImg = syncP.thumbnail_url || (syncVars[0]?.files?.[0]?.preview_url) || null;

    const gallery: string[] = [];
    if (mainImg) gallery.push(mainImg);

    const variants: UnifiedVariant[] = syncVars.map((v, i) => {
      const cost = v.retail_price ? parseFloat(v.retail_price) : 20.0;
      return {
        id: `pf-var-${v.id}`,
        supplierVariantId: String(v.id),
        name: v.name || `Variant ${i + 1}`,
        sku: v.sku || `PF-${v.id}`,
        color: v.color || null,
        size: v.size || null,
        price: parseFloat((cost * 1.4).toFixed(2)),
        costPrice: cost,
        priceDelta: 0,
        stock: v.availability_status === "active" ? 999 : 0,
        image: v.files?.[0]?.preview_url || mainImg,
      };
    });

    return {
      supplierProductId: String(syncP.id),
      supplierType: "PRINTFUL",
      title: syncP.name,
      description: `High-grade custom printed ${syncP.name}.`,
      category: "Apparel & Accessories",
      brand: "Printful",
      costPrice: variants[0]?.costPrice || 20.0,
      suggestedPrice: variants[0]?.price || 28.0,
      mainImage: mainImg,
      galleryImages: gallery,
      variants,
      status: "active",
      rawSupplierData: detail,
    };
  }

  async getVariants(supplierProductId: string): Promise<UnifiedVariant[]> {
    const prod = await this.getProduct(supplierProductId);
    return prod ? prod.variants : [];
  }

  async importProduct(options: UnifiedImportOptions): Promise<UnifiedImportResult> {
    const report = await importPrintfulProduct({
      sync_product_id: options.supplierProductId,
      action: options.action || "import",
      markup_percent: options.markupPercent || 40,
    });

    return {
      status: report.status === "imported" ? "imported" : report.status === "already_imported" ? "already_imported" : "error",
      supplierProductId: options.supplierProductId,
      supplierType: "PRINTFUL",
      productId: report.product?.id,
      slug: report.product?.slug,
      message: report.message,
      logs: report.logs || [],
      durationMs: report.durationMs || 0,
    };
  }

  async syncProduct(supplierProductId: string): Promise<UnifiedSyncResult> {
    const report = await importPrintfulProduct({
      sync_product_id: supplierProductId,
      action: "update",
    });

    return {
      supplierProductId,
      supplierType: "PRINTFUL",
      isNew: false,
      isUpdated: report.status === "imported",
      message: report.message,
    };
  }

  async createOrder(orderInput: UnifiedOrderInput): Promise<UnifiedOrderResult> {
    try {
      const order = await printfulService.createOrder(
        {
          external_id: orderInput.orderId,
          recipient: {
            name: orderInput.recipient.name,
            email: orderInput.recipient.email,
            phone: orderInput.recipient.phone,
            address1: orderInput.recipient.address1,
            address2: orderInput.recipient.address2,
            city: orderInput.recipient.city,
            state_code: orderInput.recipient.state,
            country_code: orderInput.recipient.country.substring(0, 2).toUpperCase(),
            zip: orderInput.recipient.zip,
          },
          items: orderInput.items.map((i) => ({
            sync_variant_id: i.supplierVariantId ? parseInt(i.supplierVariantId, 10) || undefined : undefined,
            quantity: i.quantity,
            name: i.title,
            retail_price: String(i.price),
          })),
        },
        true // confirm order
      );

      return {
        success: true,
        supplierOrderId: String(order.id),
        supplierType: "PRINTFUL",
        message: `Order submitted to Printful (ID: ${order.id})`,
        status: "confirmed",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        supplierOrderId: "",
        supplierType: "PRINTFUL",
        message: `Printful Order Failed: ${msg}`,
        status: "failed",
      };
    }
  }

  async trackOrder(supplierOrderId: string): Promise<UnifiedTrackingResult> {
    try {
      const order = await printfulClient.getOrder(supplierOrderId);
      const shipment = order.shipments?.[0];

      return {
        orderId: supplierOrderId,
        supplierType: "PRINTFUL",
        supplierOrderId: String(order.id),
        status: shipment ? "shipped" : order.status === "fulfilled" ? "delivered" : "processing",
        carrier: shipment?.carrier || "Printful Courier",
        trackingNumber: shipment?.tracking_number || undefined,
        trackingUrl: shipment?.tracking_url || undefined,
      };
    } catch {
      return {
        orderId: supplierOrderId,
        supplierType: "PRINTFUL",
        supplierOrderId,
        status: "processing",
      };
    }
  }

  async calculateShipping(input: UnifiedShippingInput): Promise<UnifiedShippingResult> {
    try {
      const rates = await printfulService.estimateShipping({
        recipient: {
          name: input.recipient.name,
          email: input.recipient.email,
          address1: input.recipient.address1,
          city: input.recipient.city,
          state_code: input.recipient.state,
          country_code: input.recipient.country.substring(0, 2).toUpperCase(),
          zip: input.recipient.zip,
        },
        items: input.items.map((i) => ({
          sync_variant_id: parseInt(i.supplierVariantId, 10) || undefined,
          quantity: i.quantity,
        })),
      });

      const unifiedRates: UnifiedShippingRate[] = rates.map((r) => ({
        id: r.id,
        name: r.name,
        rate: parseFloat(r.rate),
        currency: r.currency,
        minDeliveryDays: r.minDeliveryDays,
        maxDeliveryDays: r.maxDeliveryDays,
      }));

      return {
        success: true,
        rates: unifiedRates,
        supplierType: "PRINTFUL",
      };
    } catch (err: unknown) {
      return {
        success: false,
        rates: [],
        supplierType: "PRINTFUL",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const res = await printfulClient.testConnection();
    return {
      ok: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
    };
  }
}
