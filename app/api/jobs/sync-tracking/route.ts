/**
 * POST /api/jobs/sync-tracking
 *
 * Background scheduled job route to automatically sync tracking information
 * from CJ Dropshipping for all active processing/shipped orders.
 */

import { type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { syncOrderTrackingFromCJ } from "@/lib/fulfillment";
import { emitShipmentNotification } from "@/lib/notifications";
import type { Order } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Optional secret check if authorization header is provided
    if (secret && authHeader && authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized cron request." }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();

    // Query active orders needing tracking updates
    const { data: activeOrders, error } = await supabase
      .from("orders")
      .select("id, status, cj_order_id, customer_email, customer_first_name, customer_last_name")
      .not("cj_order_id", "is", null)
      .in("status", ["processing", "shipped", "confirmed"]);

    if (error) throw error;

    const ordersToSync = (activeOrders ?? []) as Order[];
    console.info(`[cron-tracking-sync] Found ${ordersToSync.length} active orders to sync.`);

    let updatedCount = 0;
    const errors: Array<{ orderId: string; error: string }> = [];

    for (const order of ordersToSync) {
      try {
        const prevStatus = order.status;
        const res = await syncOrderTrackingFromCJ(order.id);

        if (res.success && res.order) {
          updatedCount++;
          const newStatus = res.order.status;

          // Emit notification event if status progressed
          if (prevStatus !== "shipped" && newStatus === "shipped") {
            await emitShipmentNotification({
              type: "order_shipped",
              orderId: order.id,
              customerEmail: order.customer_email,
              customerName: `${order.customer_first_name} ${order.customer_last_name}`,
              trackingNumber: res.order.tracking_number || undefined,
              shippingCarrier: res.order.shipping_carrier || undefined,
              trackingUrl: res.order.tracking_url || undefined,
            });
          } else if (newStatus === "delivered") {
            await emitShipmentNotification({
              type: "order_delivered",
              orderId: order.id,
              customerEmail: order.customer_email,
              customerName: `${order.customer_first_name} ${order.customer_last_name}`,
              trackingNumber: res.order.tracking_number || undefined,
              shippingCarrier: res.order.shipping_carrier || undefined,
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sync failed";
        console.error(`[cron-tracking-sync] Error syncing order ${order.id}:`, msg);
        errors.push({ orderId: order.id, error: msg });
      }
    }

    return Response.json({
      success: true,
      processedCount: ordersToSync.length,
      updatedCount,
      errorsCount: errors.length,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron-tracking-sync] Job execution failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Tracking sync job failed." },
      { status: 500 }
    );
  }
}
