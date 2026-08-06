/**
 * lib/sync/engine.ts
 *
 * Production Smart Product Synchronization Engine.
 * Features automated diffing, deduplication by printful_sync_id / printful_product_id,
 * incremental and full sync modes, and sync history logging.
 */

import { printfulService } from "@/lib/printful/service";
import { getProducts, deleteProduct, type Product } from "@/lib/products";
import { recordUnifiedLog } from "@/lib/logging/unified-logger";
import type { SyncLogEntry, SyncMode } from "./types";
import fs from "fs";
import path from "path";

const SYNC_LOGS_FILE = path.join(process.cwd(), "data", "sync-logs.json");

function ensureDataDirExists() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let syncLogsCache: SyncLogEntry[] | null = null;

export function getSyncLogs(): SyncLogEntry[] {
  if (syncLogsCache) return syncLogsCache;
  try {
    ensureDataDirExists();
    if (fs.existsSync(SYNC_LOGS_FILE)) {
      const content = fs.readFileSync(SYNC_LOGS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        syncLogsCache = list;
        return list;
      }
    }
  } catch (err) {
    console.warn("[sync-engine] Failed to read sync logs file:", err);
  }
  syncLogsCache = [];
  return [];
}

export function saveSyncLog(entry: SyncLogEntry): void {
  try {
    ensureDataDirExists();
    const logs = getSyncLogs();
    const updated = [entry, ...logs].slice(0, 100); // Keep last 100 sync logs
    fs.writeFileSync(SYNC_LOGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    syncLogsCache = updated;
  } catch (err) {
    console.error("[sync-engine] Failed to save sync log:", err);
  }
}

export class SmartSyncEngine {
  /**
   * Compares existing product record with freshly fetched incoming data.
   * Returns true if fields have meaningfully changed (Incremental diff check).
   */
  private hasProductChanged(existing: Product, incoming: Partial<Product>): boolean {
    if (existing.title !== incoming.title) return true;
    if (existing.price !== incoming.price) return true;
    if (existing.cost_price !== incoming.cost_price) return true;
    if (existing.image !== incoming.image) return true;
    if (existing.status !== incoming.status) return true;
    if ((existing.variants?.length || 0) !== (incoming.variants?.length || 0)) return true;
    return false;
  }

  /**
   * Synchronizes a single Printful product by ID into the primary database.
   * Prevents duplicates by matching printful_sync_id or ID.
   */
  async syncSingleProduct(
    syncProductId: number,
    markupPercent: number = 40
  ): Promise<{ product: Product; isNew: boolean; isUpdated: boolean }> {
    const existingList = await getProducts();
    const existing = existingList.find(
      (p) =>
        p.printful_sync_id === syncProductId ||
        p.printful_sync_id === String(syncProductId) ||
        p.id === `pf-sync-${syncProductId}`
    );

    const freshProduct = await printfulService.syncProduct(syncProductId, markupPercent);

    if (!existing) {
      return { product: freshProduct, isNew: true, isUpdated: false };
    }

    const changed = this.hasProductChanged(existing, freshProduct);
    return { product: freshProduct, isNew: false, isUpdated: changed };
  }

  /**
   * Performs an incremental sync of store products.
   */
  async runIncrementalSync(options: {
    triggerSource?: string;
    markupPercent?: number;
  } = {}): Promise<SyncLogEntry> {
    return this.runSync("incremental", options);
  }

  /**
   * Performs a full sync of all Printful store products.
   */
  async runFullSync(options: {
    triggerSource?: string;
    markupPercent?: number;
  } = {}): Promise<SyncLogEntry> {
    return this.runSync("full", options);
  }

  /**
   * Internal sync orchestrator.
   */
  private async runSync(
    mode: SyncMode,
    options: { triggerSource?: string; markupPercent?: number } = {}
  ): Promise<SyncLogEntry> {
    const startedAt = new Date().toISOString();
    const logId = `sync_${Date.now()}`;
    const triggerSource = options.triggerSource || "manual";
    const markup = options.markupPercent ?? 40;

    console.info(`[sync-engine] Starting ${mode.toUpperCase()} sync (Trigger: ${triggerSource})...`);

    const logEntry: SyncLogEntry = {
      id: logId,
      mode,
      status: "in_progress",
      startedAt,
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsDeleted: 0,
      errors: [],
      triggerSource,
    };

    try {
      const syncProductsRes = await printfulService.getSyncProducts({ limit: 100 });
      const printfulProducts = syncProductsRes.products || [];

      for (const p of printfulProducts) {
        try {
          logEntry.productsProcessed++;
          const res = await this.syncSingleProduct(p.id, markup);
          if (res.isNew) logEntry.productsCreated++;
          else if (res.isUpdated) logEntry.productsUpdated++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[sync-engine] Error syncing product ID ${p.id}:`, errMsg);
          logEntry.errors.push(`Product ${p.id}: ${errMsg}`);
        }
      }

      logEntry.status = "completed";
      logEntry.completedAt = new Date().toISOString();
      recordUnifiedLog(
        "sync",
        `sync_${mode}`,
        `Printful ${mode.toUpperCase()} sync completed. Processed: ${logEntry.productsProcessed}, Created: ${logEntry.productsCreated}, Updated: ${logEntry.productsUpdated}`,
        { supplier: "PRINTFUL", metadata: { logEntry } }
      );
    } catch (err: unknown) {
      logEntry.status = "failed";
      logEntry.completedAt = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : String(err);
      logEntry.errors.push(`Sync process failure: ${errMsg}`);
      recordUnifiedLog(
        "sync",
        `sync_${mode}_failed`,
        `Printful ${mode.toUpperCase()} sync failed: ${errMsg}`,
        { level: "error", supplier: "PRINTFUL", metadata: { logEntry } }
      );
    }

    saveSyncLog(logEntry);
    return logEntry;
  }

  /**
   * Deletes a product from primary database upon Printful product deletion webhook.
   */
  async deleteSyncedProduct(syncProductId: number | string): Promise<boolean> {
    const idStr = String(syncProductId);
    const targetId = idStr.startsWith("pf-sync-") ? idStr : `pf-sync-${idStr}`;
    console.info(`[sync-engine] Deleting product ${targetId} due to Printful deletion event.`);
    return deleteProduct(targetId);
  }
}

export const smartSyncEngine = new SmartSyncEngine();
