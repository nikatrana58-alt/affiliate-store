/**
 * POST /api/admin/orders/[id]/fulfill-cj
 *
 * Admin endpoint: Validates stock & destination with CJ Dropshipping,
 * submits order for fulfillment, saves CJ Order ID, and updates order status.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { fulfillOrderWithCJ } from "@/lib/fulfillment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireCurrentAdmin();
    const { id } = await context.params;

    if (!id) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const result = await fulfillOrderWithCJ(id);

    if (!result.success) {
      return Response.json(
        { error: result.error, details: result.details },
        { status: 422 }
      );
    }

    return Response.json({
      success: true,
      cjOrderId: result.cjOrderId,
      order: result.order,
    });
  } catch (error) {
    console.error("[api/admin/orders/[id]/fulfill-cj] Failed to fulfill order with CJ:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Fulfillment failed." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
