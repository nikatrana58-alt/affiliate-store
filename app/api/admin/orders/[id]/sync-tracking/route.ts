/**
 * POST /api/admin/orders/[id]/sync-tracking
 *
 * Admin endpoint: Synchronizes tracking number, carrier, and shipment status
 * from CJ Dropshipping for an existing CJ Order.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { syncOrderTrackingFromCJ } from "@/lib/fulfillment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireCurrentAdmin();
    const { id } = await context.params;

    if (!id) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const result = await syncOrderTrackingFromCJ(id);

    return Response.json({
      success: true,
      trackingInfo: result.trackingInfo,
      order: result.order,
    });
  } catch (error) {
    console.error("[api/admin/orders/[id]/sync-tracking] Tracking sync failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Tracking sync failed." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
