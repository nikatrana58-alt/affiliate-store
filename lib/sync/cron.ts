/**
 * lib/sync/cron.ts
 *
 * Production scheduled cron runner for automated Printful synchronization.
 * Compatible with Vercel Cron, GitHub Actions, and external webhooks.
 */

import { smartSyncEngine } from "./engine";
import { revalidateTag } from "next/cache";

export interface CronSyncOptions {
  secret?: string;
  mode?: "incremental" | "full";
}

/**
 * Validates request authorization and executes scheduled sync.
 */
export async function executeScheduledSync(
  authHeader?: string | null,
  options: CronSyncOptions = {}
): Promise<{ success: boolean; message: string; log?: unknown }> {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!bearerToken || bearerToken !== cronSecret) {
      console.warn("[sync-cron] Unauthorized cron execution attempt.");
      return { success: false, message: "Unauthorized: Invalid CRON_SECRET token" };
    }
  }

  const syncMode = options.mode || "incremental";
  console.info(`[sync-cron] Executing scheduled ${syncMode} sync...`);

  try {
    const log = syncMode === "full"
      ? await smartSyncEngine.runFullSync({ triggerSource: "cron_scheduler" })
      : await smartSyncEngine.runIncrementalSync({ triggerSource: "cron_scheduler" });

    // Invalidate next cache tags
    try {
      revalidateTag("products", { expire: 0 });
      revalidateTag("categories", { expire: 0 });
    } catch {
      // Revalidation tag in edge or script context
    }

    return {
      success: log.status === "completed",
      message: `Scheduled ${syncMode} sync completed successfully. Processed: ${log.productsProcessed}, Created: ${log.productsCreated}, Updated: ${log.productsUpdated}`,
      log,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-cron] Scheduled sync execution failed:", err);
    return { success: false, message: `Scheduled sync failed: ${message}` };
  }
}
