/**
 * lib/pricing/smart-pricing-engine.ts
 *
 * Production Smart Pricing Engine V2.
 * 
 * Rules:
 * 1. Supplier Cost is 100% IMMUTABLE.
 * 2. Smart Profit & Markup Modes (fixed_profit, markup_percent, manual_override).
 * 3. Global Campaigns (+/$ or +/%) apply dynamically without altering supplier cost.
 * 4. Manual overrides survive recalculations until explicitly reset.
 * 5. Single unified source of truth for display prices across Home, Search, Categories, Detail, Cart, Checkout, Orders.
 */

export type PricingMode = "fixed_profit" | "markup_percent" | "manual_override";

export interface CampaignConfig {
  id?: string;
  name: string;
  type: "fixed" | "percent";
  value: number; // e.g. -5 for -$5, 20 for +20%
  active: boolean;
}

export interface SmartVariantPricingInput {
  id?: string;
  name?: string;
  supplierCost?: number | null;
  cost_price?: number | null;
  price?: number | null;
  price_delta?: number;
  pricingMode?: PricingMode;
  manualOverridePrice?: number | null;
  manualOverride?: boolean;
}

export interface SmartProductPricingInput {
  id?: string;
  price?: number | null;
  cost_price?: number | null;
  profit?: number | null;
  globalPricingMode?: PricingMode;
  globalProfit?: number; // e.g. $5.00
  globalMarkupPercent?: number; // e.g. 40%
  campaign?: CampaignConfig | null;
  variants?: SmartVariantPricingInput[] | null;
  compare_at_price?: number | null;
}

export interface CalculatedVariantPrice {
  id?: string;
  name?: string;
  supplierCost: number;
  pricingMode: PricingMode;
  isManualOverride: boolean;
  baseCalculatedPrice: number;
  campaignAdjustment: number;
  finalPrice: number;
  compareAtPrice: number;
  profit: number;
  marginPercent: number;
}

export interface CalculatedProductPricing {
  displayPrice: number;
  compareAtPrice: number | null;
  minPrice: number;
  maxPrice: number;
  hasMultiplePrices: boolean;
  lowestSupplierCost: number;
  averageProfit: number;
  averageMarginPercent: number;
  variants: CalculatedVariantPrice[];
}

export class SmartPricingEngine {
  /**
   * Safe numeric conversion helper
   */
  private static safeNum(val: any, fallback: number = 0): number {
    if (val == null) return fallback;
    const num = typeof val === "number" ? val : Number(val);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Psychological rounding to standard e-commerce price points (.99)
   */
  static roundPsychological(price: number): number {
    const safeP = Math.max(0, this.safeNum(price, 0));
    if (safeP <= 0) return 0.99;
    const rounded = Math.ceil(safeP);
    return parseFloat((rounded - 0.01).toFixed(2));
  }

  /**
   * Calculates pricing for a single variant.
   */
  static calculateVariant(
    variant: SmartVariantPricingInput,
    product: SmartProductPricingInput
  ): CalculatedVariantPrice {
    const rawCost = variant.supplierCost ?? variant.cost_price ?? product?.cost_price ?? 0;
    const supplierCost = Math.max(0, parseFloat(this.safeNum(rawCost, 0).toFixed(2)));

    const mode: PricingMode =
      variant.pricingMode ||
      (variant.manualOverride ? "manual_override" : product?.globalPricingMode || "fixed_profit");

    let basePrice = supplierCost;

    if (mode === "manual_override" && (variant.manualOverridePrice != null || variant.price != null)) {
      basePrice = Math.max(0, this.safeNum(variant.manualOverridePrice ?? variant.price ?? supplierCost, supplierCost));
    } else if (mode === "markup_percent") {
      const markupPct = this.safeNum(product?.globalMarkupPercent, 40);
      basePrice = supplierCost * (1 + markupPct / 100);
    } else {
      // Fixed Profit Mode (Default)
      const profitVal = this.safeNum(product?.globalProfit ?? product?.profit, 5.0);
      basePrice = supplierCost + profitVal;
    }

    // Apply Campaign Adjustment if active
    let campaignAdj = 0;
    let finalPrice = basePrice;

    if (product?.campaign && product.campaign.active) {
      const campVal = this.safeNum(product.campaign.value, 0);
      if (product.campaign.type === "fixed") {
        campaignAdj = campVal;
        finalPrice = Math.max(supplierCost, basePrice + campaignAdj);
      } else if (product.campaign.type === "percent") {
        campaignAdj = basePrice * (campVal / 100);
        finalPrice = Math.max(supplierCost, basePrice + campaignAdj);
      }
    }

    finalPrice = parseFloat(this.safeNum(finalPrice, 0).toFixed(2));
    const profit = parseFloat((finalPrice - supplierCost).toFixed(2));
    const marginPercent = finalPrice > 0 ? parseFloat(((profit / finalPrice) * 100).toFixed(2)) : 0;
    const compareAtPrice = parseFloat((finalPrice * 1.35).toFixed(2));

    return {
      id: variant.id,
      name: variant.name,
      supplierCost,
      pricingMode: mode,
      isManualOverride: mode === "manual_override",
      baseCalculatedPrice: parseFloat(this.safeNum(basePrice, 0).toFixed(2)),
      campaignAdjustment: parseFloat(this.safeNum(campaignAdj, 0).toFixed(2)),
      finalPrice,
      compareAtPrice,
      profit,
      marginPercent,
    };
  }

  /**
   * Main Pricing Engine calculation entry point for products.
   * Returns unified display price (lowest variant price), compareAtPrice, min/max range, and calculated variants.
   */
  static calculate(product: SmartProductPricingInput | null | undefined): CalculatedProductPricing {
    if (!product || typeof product !== "object") {
      return {
        displayPrice: 0,
        compareAtPrice: null,
        minPrice: 0,
        maxPrice: 0,
        hasMultiplePrices: false,
        lowestSupplierCost: 0,
        averageProfit: 0,
        averageMarginPercent: 0,
        variants: [],
      };
    }

    const rawVariants = Array.isArray(product.variants) ? product.variants : [];

    if (rawVariants.length > 0) {
      const calculatedVariants = rawVariants.map((v) => this.calculateVariant(v, product));
      const finalPrices = calculatedVariants.map((v) => v.finalPrice);
      const minPrice = Math.min(...finalPrices);
      const maxPrice = Math.max(...finalPrices);
      const costs = calculatedVariants.map((v) => v.supplierCost);
      const lowestSupplierCost = Math.min(...costs);

      const totalProfit = calculatedVariants.reduce((sum, v) => sum + v.profit, 0);
      const avgProfit = parseFloat((totalProfit / calculatedVariants.length).toFixed(2));

      const totalMargin = calculatedVariants.reduce((sum, v) => sum + v.marginPercent, 0);
      const avgMargin = parseFloat((totalMargin / calculatedVariants.length).toFixed(2));

      const compAt = product.compare_at_price != null
        ? parseFloat(this.safeNum(product.compare_at_price, 0).toFixed(2))
        : parseFloat((minPrice * 1.35).toFixed(2));

      return {
        displayPrice: minPrice,
        compareAtPrice: compAt,
        minPrice,
        maxPrice,
        hasMultiplePrices: maxPrice > minPrice,
        lowestSupplierCost,
        averageProfit: avgProfit,
        averageMarginPercent: avgMargin,
        variants: calculatedVariants,
      };
    }

    // Fallback for single-product without variants
    const cost = Math.max(0, this.safeNum(product.cost_price, 0));
    const profit = this.safeNum(product.globalProfit ?? product.profit, 5.0);
    let calcFinalPrice = cost + profit;

    if (product.campaign && product.campaign.active) {
      const campVal = this.safeNum(product.campaign.value, 0);
      if (product.campaign.type === "fixed") {
        calcFinalPrice = Math.max(cost, calcFinalPrice + campVal);
      } else if (product.campaign.type === "percent") {
        calcFinalPrice = Math.max(cost, calcFinalPrice * (1 + campVal / 100));
      }
    }

    let finalPrice = calcFinalPrice;
    if (product.price != null && product.price !== ("" as any)) {
      const explicitPrice = this.safeNum(product.price, -1);
      if (explicitPrice >= 0) {
        finalPrice = explicitPrice;
      }
    }

    finalPrice = parseFloat(this.safeNum(finalPrice, 0).toFixed(2));
    const compareAt = product.compare_at_price != null
      ? parseFloat(this.safeNum(product.compare_at_price, 0).toFixed(2))
      : parseFloat((finalPrice * 1.35).toFixed(2));
    const calcProfit = parseFloat((finalPrice - cost).toFixed(2));
    const margin = finalPrice > 0 ? parseFloat(((calcProfit / finalPrice) * 100).toFixed(2)) : 0;

    return {
      displayPrice: finalPrice,
      compareAtPrice: compareAt,
      minPrice: finalPrice,
      maxPrice: finalPrice,
      hasMultiplePrices: false,
      lowestSupplierCost: cost,
      averageProfit: calcProfit,
      averageMarginPercent: margin,
      variants: [],
    };
  }

  /**
   * Helper method to get uniform display price for any product object.
   */
  static getDisplayPrice(product: any): {
    price: number;
    compareAtPrice: number | null;
    minPrice: number;
    maxPrice: number;
    hasMultiplePrices: boolean;
  } {
    const calc = this.calculate(product);
    return {
      price: calc.displayPrice,
      compareAtPrice: calc.compareAtPrice,
      minPrice: calc.minPrice,
      maxPrice: calc.maxPrice,
      hasMultiplePrices: calc.hasMultiplePrices,
    };
  }
}
