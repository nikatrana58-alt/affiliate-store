import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  getOrderById,
  getOrderStatusHistory,
  getPaymentByOrderId,
  updateOrderStatus,
  updateOrderNotes,
  updateShipmentTracking,
} from "@/lib/orders";
import type { OrderStatus } from "@/lib/orders";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireCurrentAdmin();
    const { id } = await context.params;

    if (!id) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const [order, history, payment] = await Promise.all([
      getOrderById(id),
      getOrderStatusHistory(id),
      getPaymentByOrderId(id),
    ]);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    return Response.json({ order, history, payment });
  } catch (error) {
    console.error("[api/admin/orders/[id]] GET failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load order." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireCurrentAdmin();
    const { id } = await context.params;

    if (!id) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const body = (await request.json()) as {
      status?: string;
      note?: string;
      notes?: string;
      tracking_number?: string;
      shipping_carrier?: string;
      tracking_url?: string;
      estimated_delivery?: string;
      fulfillment_status?: string;
    };

    let updatedOrder;

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status as OrderStatus)) {
        return Response.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      updatedOrder = await updateOrderStatus(id, body.status as OrderStatus, {
        note: body.note || (body.notes ? `Admin note: ${body.notes}` : undefined),
        changedBy: admin.email ?? admin.uid,
      });
    }

    if (typeof body.notes === "string") {
      updatedOrder = await updateOrderNotes(id, body.notes);
    }

    if (
      body.tracking_number !== undefined ||
      body.shipping_carrier !== undefined ||
      body.tracking_url !== undefined ||
      body.estimated_delivery !== undefined ||
      body.fulfillment_status !== undefined
    ) {
      updatedOrder = await updateShipmentTracking(id, {
        tracking_number: body.tracking_number,
        shipping_carrier: body.shipping_carrier,
        tracking_url: body.tracking_url,
        estimated_delivery: body.estimated_delivery,
        fulfillment_status: body.fulfillment_status,
      });
    }

    if (!updatedOrder) {
      return Response.json({ error: "No changes provided." }, { status: 400 });
    }

    const [history, payment] = await Promise.all([
      getOrderStatusHistory(id),
      getPaymentByOrderId(id),
    ]);

    return Response.json({ order: updatedOrder, history, payment });
  } catch (error) {
    console.error("[api/admin/orders/[id]] PATCH failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update order." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}


