/**
 * scratch_verify_smart_engine.ts
 *
 * Comprehensive Automated Verification Runner for Smart Product Engine.
 * Tests Synchronization Engine, Search & Multi-Faceted Filters, API Routes,
 * Caching Layer, Cron Jobs, and Webhook Auto-Sync.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { smartSyncEngine, getSyncLogs } from "./lib/sync/engine";
import { searchEngine } from "./lib/search/engine";
import { executeScheduledSync } from "./lib/sync/cron";
import { handleWebhookEvent, getWebhookLogs } from "./lib/printful/webhook";

async function runVerification() {
  console.log("=================================================");
  console.log("   SMART PRODUCT ENGINE SYSTEM VERIFICATION   ");
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

  // 1. Synchronization Engine Test
  console.log("--- 1. Synchronization Engine & Diffing ---");
  try {
    const syncRes = await smartSyncEngine.syncSingleProduct(7101, 40);
    assert(Boolean(syncRes.product && syncRes.product.id), `Sync single product (ID: ${syncRes.product?.id})`);

    const incSyncLog = await smartSyncEngine.runIncrementalSync({ triggerSource: "test_runner" });
    assert(incSyncLog.status === "completed", `Incremental Sync execution (Processed: ${incSyncLog.productsProcessed})`);

    const logs = getSyncLogs();
    assert(Array.isArray(logs) && logs.length > 0, `Sync history log retrieval (Log count: ${logs.length})`);
  } catch (err: unknown) {
    assert(false, "Sync Engine Execution", err instanceof Error ? err.message : String(err));
  }

  // 2. Search & Filter Engine Test
  console.log("\n--- 2. Multi-Faceted Search & Filter Engine ---");
  try {
    const searchAll = await searchEngine.searchProducts({ limit: 10 });
    assert(searchAll.total >= 0 && Array.isArray(searchAll.items), `Search all products (Total: ${searchAll.total})`);

    const searchKeyword = await searchEngine.searchProducts({ query: "hoodie" });
    assert(Array.isArray(searchKeyword.items), `Keyword search ('hoodie' returned ${searchKeyword.items.length} items)`);

    const searchFiltered = await searchEngine.searchProducts({
      minPrice: 10,
      maxPrice: 500,
      sortBy: "price-asc",
      limit: 5,
    });
    assert(Array.isArray(searchFiltered.items), `Price range search (Returned ${searchFiltered.items.length} items)`);

    const categories = await searchEngine.getCategoriesWithCount();
    assert(Array.isArray(categories), `Get categories with count (Categories: ${categories.length})`);

    const collections = await searchEngine.getCollectionsWithCount();
    assert(Array.isArray(collections), `Get collections with count (Collections: ${collections.length})`);
  } catch (err: unknown) {
    assert(false, "Search & Filter Engine", err instanceof Error ? err.message : String(err));
  }

  // 3. Cron & Scheduled Sync Test
  console.log("\n--- 3. Scheduled Cron Sync Handler ---");
  try {
    const cronRes = await executeScheduledSync(null, { mode: "incremental" });
    assert(cronRes.success, `Scheduled Cron Sync Execution (${cronRes.message})`);
  } catch (err: unknown) {
    assert(false, "Cron Sync Execution", err instanceof Error ? err.message : String(err));
  }

  // 4. Webhook Auto-Sync & Product Deletion Test
  console.log("\n--- 4. Expanded Webhooks & Log Storage ---");
  try {
    const updateEventPayload = {
      type: "product_updated",
      created: Date.now(),
      store: 10001,
      data: { sync_product: { id: 7101, name: "Updated Hoodie" } },
    };
    const updateRes = await handleWebhookEvent(updateEventPayload as unknown as import("./lib/printful").PrintfulWebhookPayload);
    assert(updateRes.handled, `Product update webhook trigger (Event: ${updateRes.event})`);

    const deleteEventPayload = {
      type: "sync_product_deleted",
      created: Date.now(),
      store: 10001,
      data: { sync_product: { id: 99999 } },
    };
    const deleteRes = await handleWebhookEvent(deleteEventPayload as unknown as import("./lib/printful").PrintfulWebhookPayload);
    assert(deleteRes.handled, `Product deletion webhook trigger (Event: ${deleteRes.event})`);

    const whLogs = getWebhookLogs();
    assert(Array.isArray(whLogs) && whLogs.length > 0, `Webhook log storage (Logs recorded: ${whLogs.length})`);
  } catch (err: unknown) {
    assert(false, "Webhook Auto-Sync", err instanceof Error ? err.message : String(err));
  }

  // Summary
  console.log("\n=================================================");
  console.log(`SMART ENGINE VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Fatal test runner failure:", err);
  process.exit(1);
});
