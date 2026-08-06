import { NextRequest, NextResponse } from "next/server";
import { smartSyncEngine } from "@/lib/sync/engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") || "incremental") as "incremental" | "full";
    const body = await request.json().catch(() => ({}));

    const syncMode = body.mode || mode;
    let logEntry;

    if (syncMode === "full") {
      logEntry = await smartSyncEngine.runFullSync({ triggerSource: "admin_panel" });
    } else {
      logEntry = await smartSyncEngine.runIncrementalSync({ triggerSource: "admin_panel" });
    }

    return NextResponse.json({
      success: logEntry.status === "completed",
      message: `Printful ${logEntry.mode.toUpperCase()} sync ${logEntry.status}. Processed: ${logEntry.productsProcessed}, Created: ${logEntry.productsCreated}, Updated: ${logEntry.productsUpdated}`,
      syncLog: logEntry,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
