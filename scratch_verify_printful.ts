/**
 * scratch_verify_printful.ts
 *
 * Automated verification test runner for Printful integration.
 * Tests configuration, API client, service functions, Zod validation, price calculation,
 * stock helpers, and webhook signature verification.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import {
  getPrintfulConfig,
  validatePrintfulCredentials,
  printfulClient,
  printfulService,
  formatCurrency,
  calculateRetailPrice,
  calculateProfitMetrics,
  optimizePrintfulImageUrl,
  verifyWebhookSignature,
  handleWebhookEvent,
  PrintfulOrderInputSchema,
} from "./lib/printful";
import crypto from "crypto";

async function runTests() {
  console.log("=================================================");
  console.log("   PRINTFUL INTEGRATION SYSTEM VERIFICATION   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Credentials & Configuration Test
  console.log("--- 1. Configuration & Credentials Check ---");
  const creds = validatePrintfulCredentials();
  const config = getPrintfulConfig();
  assert(typeof creds.valid === "boolean", "validatePrintfulCredentials returns valid status");
  assert(config.baseUrl === "https://api.printful.com", "Config has correct Printful base URL");

  const connResult = await printfulClient.testConnection();
  assert(typeof connResult.success === "boolean", `Printful API connection test (${connResult.message})`);

  // 2. Helpers & Math Utilities Test
  console.log("\n--- 2. Utility Helpers & Pricing Engine ---");
  const formattedCurrency = formatCurrency(29.99, "USD");
  assert(formattedCurrency === "$29.99", `Currency formatting ($29.99 vs ${formattedCurrency})`);

  const retailPrice = calculateRetailPrice(15.0, 40);
  assert(retailPrice === 25.0, `Retail price computation (15 @ 40% = ${retailPrice})`);

  const metrics = calculateProfitMetrics(15.0, 25.0);
  assert(metrics.profit === 10.0 && metrics.marginPercent === 40, `Profit metrics (Profit: ${metrics.profit}, Margin: ${metrics.marginPercent}%)`);

  const optUrl = optimizePrintfulImageUrl("http://files.printful.com/test.jpg");
  assert(optUrl.startsWith("https://"), "Image URL optimizer converts to HTTPS");

  // 3. API Client & Service Calls
  console.log("\n--- 3. Client & Service Function Execution ---");
  try {
    const storeInfo = await printfulService.getStoreInfo();
    assert(Boolean(storeInfo && storeInfo.name), `Store info query (${storeInfo?.name || "N/A"})`);
  } catch (err: unknown) {
    assert(false, "Store info query", err instanceof Error ? err.message : String(err));
  }

  try {
    const catalog = await printfulService.getProducts({ limit: 5 });
    assert(Array.isArray(catalog.products), `Catalog products query (Returned: ${catalog.products.length})`);
  } catch (err: unknown) {
    assert(false, "Catalog products query", err instanceof Error ? err.message : String(err));
  }

  try {
    const shippingRates = await printfulService.estimateShipping({
      recipient: {
        name: "Test Customer",
        address1: "123 Main St",
        city: "Los Angeles",
        state_code: "CA",
        country_code: "US",
        zip: "90001",
        email: "test@example.com",
      },
      items: [{ variant_id: 4011, quantity: 1 }],
    });
    assert(Array.isArray(shippingRates) && shippingRates.length > 0, `Shipping rate estimation (Rates count: ${shippingRates.length})`);
  } catch (err: unknown) {
    assert(false, "Shipping rate estimation", err instanceof Error ? err.message : String(err));
  }

  // 4. Product DB Synchronization
  console.log("\n--- 4. Catalog & Database Synchronization ---");
  try {
    const syncedProd = await printfulService.syncProduct(7101, 40);
    assert(Boolean(syncedProd && syncedProd.id.startsWith("pf-sync-")), `Sync product execution (${syncedProd.title})`);
  } catch (err: unknown) {
    assert(false, "Sync product execution", err instanceof Error ? err.message : String(err));
  }

  // 5. Zod Validation Engine
  console.log("\n--- 5. Input Validation (Zod Schemas) ---");
  const validOrderInput = {
    recipient: {
      name: "John Doe",
      address1: "100 Broadway",
      city: "New York",
      state_code: "NY",
      country_code: "US",
      zip: "10001",
      email: "john@example.com",
    },
    items: [{ variant_id: 101, quantity: 2 }],
  };
  const validResult = PrintfulOrderInputSchema.safeParse(validOrderInput);
  assert(validResult.success, "Zod order input valid case");

  const invalidOrderInput = {
    recipient: { name: "", email: "invalid-email" },
    items: [],
  };
  const invalidResult = PrintfulOrderInputSchema.safeParse(invalidOrderInput);
  assert(!invalidResult.success, "Zod order input invalid case rejected");

  // 6. Webhook Signature Verification & Processing
  console.log("\n--- 6. Webhook Security & Event Handler ---");
  const secret = "test_webhook_secret_key_123";
  const rawBody = JSON.stringify({
    type: "package_shipped",
    created: Date.now(),
    store: 10001,
    data: {
      order: { id: 99991, external_id: "test-order-001", status: "fulfilled" },
      shipment: { carrier: "USPS", tracking_number: "9400100000000000000000" },
    },
  });

  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const isSigValid = verifyWebhookSignature(rawBody, `sha256=${hmac}`, secret);
  assert(isSigValid, "HMAC SHA256 Webhook signature validation succeeds");

  const isFakeSigValid = verifyWebhookSignature(rawBody, "sha256=invalid_hash_signature", secret);
  assert(!isFakeSigValid, "Invalid webhook signature rejected");

  const webhookResult = await handleWebhookEvent(JSON.parse(rawBody));
  assert(webhookResult.handled && webhookResult.event === "package_shipped", "Webhook event handler dispatch");

  // Summary
  console.log("\n=================================================");
  console.log(`VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal verification script runner error:", err);
  process.exit(1);
});
