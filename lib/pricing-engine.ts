/**
 * Production-Ready Automated Pricing Engine
 * 
 * Rules:
 *  1. Global Cost Tier Markups:
 *     - Cost <= $5.00       -> 3.0x Markup
 *     - $5.00 < Cost <= $20 -> 2.5x Markup
 *     - Cost > $20.00       -> 2.0x Markup
 * 
 *  2. Category-Specific Overrides:
 *     - Jewelry & Watches    -> 3.5x Markup
 *     - Apparel & Fashion    -> 2.8x Markup
 *     - Electronics & Tech   -> 2.0x Markup
 *     - Beauty & Health      -> 3.0x Markup
 * 
 *  3. Intelligent Psychological Price Rounding (.99 formatting):
 *     - Maps calculated prices to clean .99 endings (e.g. 4.20 -> 4.99, 14.20 -> 14.99 / 19.99).
 */

export type PricingResult = {
  costPrice: number;
  sellingPrice: number;
  compareAtPrice: number;
  profit: number;
  marginPercent: number;
  markupMultiplier: number;
};

// Category Multipliers dictionary (case-insensitive keyword matching)
export const CATEGORY_MARKUPS: Record<string, number> = {
  jewelry: 3.5,
  watch: 3.5,
  watches: 3.5,
  clothing: 2.8,
  apparel: 2.8,
  blouse: 2.8,
  dress: 2.8,
  electronics: 2.0,
  gadget: 2.0,
  beauty: 3.0,
  health: 3.0,
};

/**
 * Intelligent Psychological Price Rounding
 * Formats a raw calculated price into standard e-commerce .99 price points
 * (e.g., 3.80 -> 4.99, 14.20 -> 14.99, 22.10 -> 24.99, 36.50 -> 39.99, 42.00 -> 49.99)
 */
export function roundToPsychologicalPrice(rawPrice: number): number {
  if (rawPrice <= 0) return 0.99;

  if (rawPrice < 10) {
    // Under $10: round up to nearest dollar - 0.01 (e.g. 3.20 -> 3.99, 7.10 -> 7.99)
    const ceil = Math.ceil(rawPrice);
    return parseFloat((ceil - 0.01).toFixed(2));
  } else if (rawPrice < 50) {
    // $10 to $50: round up to standard 5-dollar psychological steps (14.99, 19.99, 24.99, 29.99, 34.99, 39.99, 44.99, 49.99)
    const step = 5;
    const bracket = Math.ceil(rawPrice / step) * step;
    return parseFloat((bracket - 0.01).toFixed(2));
  } else {
    // Over $50: round to nearest 10-dollar step - 0.01 (e.g., 54.00 -> 59.99, 82.00 -> 89.99, 115.00 -> 119.99)
    const step = 10;
    const bracket = Math.ceil(rawPrice / step) * step;
    return parseFloat((bracket - 0.01).toFixed(2));
  }
}

/**
 * Calculates profit and profit margin percentage
 */
export function calculateProfitMetrics(costPrice: number, sellingPrice: number) {
  const safeCost = Math.max(0, costPrice || 0);
  const safeSell = Math.max(0, sellingPrice || 0);

  const profit = parseFloat((safeSell - safeCost).toFixed(2));
  const marginPercent = safeSell > 0 ? parseFloat(((profit / safeSell) * 100).toFixed(2)) : 0;

  return { profit, marginPercent };
}

/**
 * Bi-Directional Pricing Engine Helper 1:
 * Recalculate Profit ($) & Margin (%) from Selling Price ($)
 */
export function recalculateFromSellingPrice(costPrice: number, sellingPrice: number) {
  const safeCost = Math.max(0, costPrice || 0);
  const safeSell = Math.max(0, sellingPrice || 0);
  const profit = parseFloat((safeSell - safeCost).toFixed(2));
  const marginPercent = safeSell > 0 ? parseFloat(((profit / safeSell) * 100).toFixed(2)) : 0;
  return {
    costPrice: safeCost,
    sellingPrice: parseFloat(safeSell.toFixed(2)),
    profit,
    marginPercent,
  };
}

/**
 * Bi-Directional Pricing Engine Helper 2:
 * Recalculate Selling Price ($) & Margin (%) from Net Profit ($)
 */
export function recalculateFromProfit(costPrice: number, profit: number) {
  const safeCost = Math.max(0, costPrice || 0);
  const safeProfit = Number.isFinite(profit) ? profit : 0;
  const sellingPrice = parseFloat((safeCost + safeProfit).toFixed(2));
  const marginPercent = sellingPrice > 0 ? parseFloat(((safeProfit / sellingPrice) * 100).toFixed(2)) : 0;
  return {
    costPrice: safeCost,
    sellingPrice,
    profit: parseFloat(safeProfit.toFixed(2)),
    marginPercent,
  };
}

/**
 * Bi-Directional Pricing Engine Helper 3:
 * Recalculate Selling Price ($) & Net Profit ($) from Margin Percentage (%)
 */
export function recalculateFromMargin(costPrice: number, marginPercent: number) {
  const safeCost = Math.max(0, costPrice || 0);
  const safeMargin = Math.min(99.99, Math.max(-999, Number.isFinite(marginPercent) ? marginPercent : 0));
  
  let sellingPrice = safeCost;
  if (safeMargin < 100) {
    const divisor = 1 - safeMargin / 100;
    sellingPrice = divisor > 0 ? safeCost / divisor : safeCost;
  }
  sellingPrice = parseFloat(sellingPrice.toFixed(2));
  const profit = parseFloat((sellingPrice - safeCost).toFixed(2));

  return {
    costPrice: safeCost,
    sellingPrice,
    profit,
    marginPercent: parseFloat(safeMargin.toFixed(2)),
  };
}

/**
 * Determines the applicable markup multiplier based on cost tier or category override
 */
export function getMarkupMultiplier(costPrice: number, category?: string | null): number {
  // Check category-specific rules first
  if (category) {
    const catLower = category.toLowerCase();
    for (const [key, multiplier] of Object.entries(CATEGORY_MARKUPS)) {
      if (catLower.includes(key)) {
        return multiplier;
      }
    }
  }

  // Global cost tier rules
  if (costPrice <= 5.0) {
    return 3.0; // 3x Markup for cost <= $5
  } else if (costPrice <= 20.0) {
    return 2.5; // 2.5x Markup for $5 < cost <= $20
  } else {
    return 2.0; // 2x Markup for cost > $20
  }
}

/**
 * Main pricing engine calculation method
 */
export function calculateProductPricing(
  costPrice: number,
  category?: string | null
): PricingResult {
  const safeCost = Math.max(0, costPrice || 0);
  const multiplier = getMarkupMultiplier(safeCost, category);

  const rawSellingPrice = safeCost * multiplier;
  const sellingPrice = roundToPsychologicalPrice(rawSellingPrice);

  // Compare-at price set to 1.35x of selling price, rounded to .99 MSRP
  const rawCompareAt = sellingPrice * 1.35;
  const compareAtPrice = roundToPsychologicalPrice(rawCompareAt);

  const { profit, marginPercent } = calculateProfitMetrics(safeCost, sellingPrice);

  return {
    costPrice: safeCost,
    sellingPrice,
    compareAtPrice,
    profit,
    marginPercent,
    markupMultiplier: multiplier,
  };
}
