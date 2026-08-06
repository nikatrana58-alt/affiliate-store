/**
 * lib/printful/helpers.ts
 *
 * Production utility functions for Printful integration:
 * Currency formatting, price computation, profit calculation, stock checks, CDN image optimization.
 */

import { PRINTFUL_CDN_DOMAINS } from "./constants";

/**
 * Formats a monetary amount into a clean currency string.
 */
export function formatCurrency(amount: number | string, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Calculates suggested retail price from wholesale cost and target margin percentage.
 * Example: cost 15.00, target margin 40% -> retail 25.00
 */
export function calculateRetailPrice(costPrice: number, targetMarginPercent: number = 40): number {
  if (costPrice <= 0) return 0;
  if (targetMarginPercent >= 100) return costPrice * 2;
  const retail = costPrice / (1 - targetMarginPercent / 100);
  return Math.round(retail * 100) / 100;
}

/**
 * Calculates profit amount and margin percentage from cost and retail price.
 */
export function calculateProfitMetrics(
  costPrice: number,
  retailPrice: number
): { profit: number; marginPercent: number } {
  const cost = Number(costPrice) || 0;
  const retail = Number(retailPrice) || 0;

  if (retail <= 0) {
    return { profit: 0, marginPercent: 0 };
  }

  const profit = Math.round((retail - cost) * 100) / 100;
  const marginPercent = Math.round(((retail - cost) / retail) * 10000) / 100;

  return { profit, marginPercent };
}

/**
 * Helper to determine if a Printful variant is available for order fulfillment.
 */
export function checkStockAvailability(variant: {
  in_stock?: boolean;
  synced?: boolean;
  is_ignored?: boolean;
}): { available: boolean; reason?: string } {
  if (variant.is_ignored) {
    return { available: false, reason: "Variant is ignored in Printful store." };
  }
  if (variant.in_stock === false) {
    return { available: false, reason: "Variant is currently out of stock." };
  }
  return { available: true };
}

/**
 * Checks if a given image URL belongs to Printful CDN domains.
 */
export function isPrintfulCdnUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return PRINTFUL_CDN_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Optimizes Printful image URLs for Next.js Image component loading.
 * Preserves quality and returns secure HTTPS URLs.
 */
export function optimizePrintfulImageUrl(url: string | null | undefined): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80";
  }

  // Ensure HTTPS
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith("http://")) {
    cleanUrl = cleanUrl.replace("http://", "https://");
  }

  return cleanUrl;
}
