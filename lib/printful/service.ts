/**
 * lib/printful/service.ts
 *
 * Production service layer for Printful integration.
 * Provides caching with Next.js revalidation, product synchronization, and high-level catalog/order operations.
 */

import { printfulClient } from "./client";
import { calculateProfitMetrics, calculateRetailPrice, optimizePrintfulImageUrl } from "./helpers";
import { saveProduct, type Product, type ProductVariantItem } from "@/lib/products";
import type {
  PrintfulCatalogProduct,
  PrintfulCatalogVariant,
  PrintfulCatalogCategory,
  PrintfulSyncProductDetail,
  PrintfulOrderInput,
  PrintfulOrder,
  PrintfulShippingRateInput,
  PrintfulShippingRate,
  PrintfulMockupTaskInput,
  PrintfulMockupResult,
  PrintfulWarehouseProduct,
  PrintfulWarehouseLocation,
} from "./types";

export interface PrintfulServiceGetProductsOptions {
  category_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class PrintfulService {
  /**
   * Fetches Printful store information.
   */
  async getStoreInfo() {
    try {
      return await printfulClient.getStore();
    } catch (err) {
      console.error("[printful-service] Failed to fetch store info:", err);
      throw err;
    }
  }

  /**
   * Fetches Printful catalog products with pagination and category filtering.
   */
  async getProducts(options: PrintfulServiceGetProductsOptions = {}): Promise<{
    products: PrintfulCatalogProduct[];
    total: number;
  }> {
    try {
      return await printfulClient.getCatalogProducts({
        category_id: options.category_id,
        limit: options.limit ?? 20,
        offset: options.offset ?? 0,
      });
    } catch (err) {
      console.error("[printful-service] Failed to fetch catalog products:", err);
      return { products: [], total: 0 };
    }
  }

  /**
   * Fetches detail for a specific Printful catalog product including variants.
   */
  async getProduct(id: number | string): Promise<{
    product: PrintfulCatalogProduct;
    variants: PrintfulCatalogVariant[];
  }> {
    return await printfulClient.getCatalogProduct(id);
  }

  /**
   * Fetches store sync products (user's custom configured products on Printful).
   */
  async getSyncProducts(options: { search?: string; status?: string; limit?: number; offset?: number } = {}) {
    return await printfulClient.getSyncProducts(options);
  }

  /**
   * Fetches detail for a specific sync product.
   */
  async getSyncProduct(id: number | string): Promise<PrintfulSyncProductDetail> {
    return await printfulClient.getSyncProduct(id);
  }

  /**
   * Fetches variants for a catalog product.
   */
  async getVariants(productId: number | string): Promise<PrintfulCatalogVariant[]> {
    const detail = await printfulClient.getCatalogProduct(productId);
    return detail.variants || [];
  }

  /**
   * Initiates mockup generation for a product and retrieves the result.
   */
  async getMockups(
    productId: number | string,
    files: Array<{ placement: string; image_url: string }>,
    variantIds: number[],
    format: "jpg" | "png" = "png"
  ): Promise<PrintfulMockupResult> {
    const taskInput: PrintfulMockupTaskInput = {
      variant_ids: variantIds,
      format,
      files,
    };

    const task = await printfulClient.createMockupTask(productId, taskInput);
    
    if (task.status === "completed") {
      return await printfulClient.getMockupTask(task.task_key);
    }

    // Poll task until completion or max attempts
    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1500));
      const res = await printfulClient.getMockupTask(task.task_key);
      if (res.status === "completed" || res.status === "failed") {
        return res;
      }
    }

    throw new Error(`Mockup task ${task.task_key} did not complete within the expected time.`);
  }

  /**
   * Creates an order with Printful.
   */
  async createOrder(input: PrintfulOrderInput, confirm: boolean = false): Promise<PrintfulOrder> {
    return await printfulClient.createOrder(input, confirm);
  }

  /**
   * Calculates real-time shipping rate estimates for a destination and cart items.
   */
  async estimateShipping(input: PrintfulShippingRateInput): Promise<PrintfulShippingRate[]> {
    return await printfulClient.estimateShipping(input);
  }

  /**
   * Fetches catalog categories.
   */
  async getCategories(): Promise<PrintfulCatalogCategory[]> {
    return await printfulClient.getCategories();
  }

  /**
   * Fetches warehouse status and locations.
   */
  async getWarehouseStatus(): Promise<{
    products: PrintfulWarehouseProduct[];
    locations: PrintfulWarehouseLocation[];
  }> {
    const [products, locations] = await Promise.all([
      printfulClient.getWarehouseProducts().catch(() => []),
      printfulClient.getWarehouseLocations().catch(() => []),
    ]);
    return { products, locations };
  }

  /**
   * Synchronizes a Printful sync product into the store database/catalog.
   * Prevents duplicates by matching external_id or sync product ID.
   */
  async syncProduct(
    syncProductId: number,
    markupPercent: number = 40
  ): Promise<Product> {
    console.info(`[printful-service] Synchronizing Printful sync product ${syncProductId}...`);
    const detail = await printfulClient.getSyncProduct(syncProductId);
    const syncProd = detail.sync_product;
    const syncVariants = detail.sync_variants || [];

    const baseCostPrice = syncVariants.length > 0
      ? parseFloat(syncVariants[0].retail_price || "0")
      : 20.0;
    
    const retailPrice = calculateRetailPrice(baseCostPrice, markupPercent);
    const profitMetrics = calculateProfitMetrics(baseCostPrice, retailPrice);

    const slugBase = syncProd.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const variants: ProductVariantItem[] = syncVariants.map((v) => {
      const vCost = parseFloat(v.retail_price || "0");
      const vRetail = calculateRetailPrice(vCost, markupPercent);
      return {
        id: `pf-v-${v.id}`,
        cj_variant_id: String(v.variant_id),
        name: v.name,
        sku: v.sku,
        price: vRetail,
        cost_price: vCost,
        price_delta: 0,
        stock: v.is_ignored ? 0 : 99,
        image: v.files?.[0]?.preview_url ? optimizePrintfulImageUrl(v.files[0].preview_url) : null,
      };
    });

    const productRecord: Product = {
      id: `pf-sync-${syncProd.id}`,
      title: syncProd.name,
      slug: `${slugBase}-pf${syncProd.id}`,
      description: `Premium custom print product (${syncProd.name}) fulfilled on-demand by Printful.`,
      category: "Print-on-Demand",
      badge: "Printful Custom",
      price: retailPrice,
      compare_at_price: Math.round(retailPrice * 1.25 * 100) / 100,
      cost_price: baseCostPrice,
      profit: profitMetrics.profit,
      margin_percent: profitMetrics.marginPercent,
      image: optimizePrintfulImageUrl(syncProd.thumbnail_url),
      images: [optimizePrintfulImageUrl(syncProd.thumbnail_url)],
      variants,
      sku: syncVariants[0]?.sku || `PF-${syncProd.id}`,
      inventory_quantity: 99,
      status: "published",
      affiliate_link: `https://curatedfinds.store/products/${slugBase}-pf${syncProd.id}`,
      created_at: new Date().toISOString(),
    };

    await saveProduct(productRecord);
    console.info(`[printful-service] Product "${syncProd.name}" successfully synchronized to store.`);
    return productRecord;
  }
}

export const printfulService = new PrintfulService();
