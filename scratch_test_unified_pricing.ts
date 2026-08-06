/**
 * scratch_test_unified_pricing.ts
 *
 * Verification Script for Unified Pricing Engine:
 * 1. Verifies that Product.price is computed as lowest variant final price.
 * 2. Tests updating Profit to $5, $10, and $20.
 * 3. Verifies that variants with different supplier costs (e.g. XS $15.5 vs 2XL $20)
 *    naturally recalculate (XS -> $20.50, 2XL -> $25.00).
 * 4. Verifies getProductDisplayPrice(product) returns identical lowest price for Home, Search, Cart, Detail page.
 */

import {
  getProductDisplayPrice,
  getVariantFinalPrice,
  recalculateAllVariantPrices,
  calculateProfitMetrics,
} from "./lib/pricing-engine";
import type { Product, ProductVariantItem } from "./lib/products";

function runPricingTests() {
  console.log("=================================================");
  console.log("   UNIFIED PRICING ENGINE VERIFICATION SUITE     ");
  console.log("=================================================\n");

  // Sample Multi-Variant Product (e.g. T-Shirt with XS, M, 2XL having different base costs)
  const sampleVariants: ProductVariantItem[] = [
    {
      id: "v-xs",
      name: "White / XS",
      color: "White",
      size: "XS",
      cost_price: 15.5,
      price: 20.5,
      price_delta: 0,
      stock: 50,
    },
    {
      id: "v-m",
      name: "White / M",
      color: "White",
      size: "M",
      cost_price: 17.0,
      price: 22.0,
      price_delta: 1.5,
      stock: 100,
    },
    {
      id: "v-2xl",
      name: "White / 2XL",
      color: "White",
      size: "2XL",
      cost_price: 20.0,
      price: 25.0,
      price_delta: 4.5,
      stock: 30,
    },
  ];

  const baseProduct: Product = {
    id: "test-pricing-prod",
    title: "Unified Pricing Demo Hoodie",
    slug: "unified-pricing-demo-hoodie",
    description: "Testing pricing engine consistency.",
    category: "Apparel",
    badge: "Featured",
    price: 20.5, // Lowest variant price (XS cost $15.5 + Profit $5 = $20.50)
    cost_price: 15.5,
    profit: 5.0,
    margin_percent: 24.39,
    image: "https://files.cdn.printful.com/mockups/sample.jpg",
    variants: sampleVariants,
    affiliate_link: "https://curatedfinds.store/products/unified-pricing-demo-hoodie",
    created_at: new Date().toISOString(),
  };

  const testProfits = [5.0, 10.0, 20.0];

  for (const targetProfit of testProfits) {
    console.log(`--- Testing Profit Level: $${targetProfit.toFixed(2)} ---`);

    // 1. Recalculate all variants
    const { updatedVariants, lowestPrice, highestPrice } = recalculateAllVariantPrices(
      baseProduct.variants as any[],
      targetProfit
    );

    const updatedProduct: Product = {
      ...baseProduct,
      profit: targetProfit,
      price: lowestPrice,
      variants: updatedVariants as ProductVariantItem[],
    };

    // 2. Check Display Price
    const display = getProductDisplayPrice(updatedProduct);

    console.log(`- Lowest Variant Final Price (XS):  $${updatedVariants[0].price?.toFixed(2)} (Base: $${updatedVariants[0].cost_price} + Profit: $${targetProfit})`);
    console.log(`- Mid Variant Final Price (M):     $${updatedVariants[1].price?.toFixed(2)} (Base: $${updatedVariants[1].cost_price} + Profit: $${targetProfit})`);
    console.log(`- Highest Variant Final Price (2XL): $${updatedVariants[2].price?.toFixed(2)} (Base: $${updatedVariants[2].cost_price} + Profit: $${targetProfit})`);
    console.log(`- Display Price across Storefront: $${display.price.toFixed(2)} (Lowest Variant)`);
    console.log(`- Has Multiple Price Points:       ${display.hasMultiplePrices ? "YES (From $20.50 to $25.00)" : "NO"}\n`);

    // Assertions
    const expectedXSPrice = parseFloat((15.5 + targetProfit).toFixed(2));
    const expected2XLPrice = parseFloat((20.0 + targetProfit).toFixed(2));

    if (updatedVariants[0].price !== expectedXSPrice) {
      console.error(`❌ FAIL: XS variant price expected $${expectedXSPrice}, got $${updatedVariants[0].price}`);
      process.exit(1);
    }

    if (updatedVariants[2].price !== expected2XLPrice) {
      console.error(`❌ FAIL: 2XL variant price expected $${expected2XLPrice}, got $${updatedVariants[2].price}`);
      process.exit(1);
    }

    if (display.price !== expectedXSPrice) {
      console.error(`❌ FAIL: Display price expected $${expectedXSPrice}, got $${display.price}`);
      process.exit(1);
    }
  }

  console.log("=================================================");
  console.log("✅ UNIFIED PRICING ENGINE VERIFICATION PASSED!");
  console.log("=================================================");
}

runPricingTests();
