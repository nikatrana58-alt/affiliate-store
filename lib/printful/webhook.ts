/**
 * lib/printful/webhook.ts
 *
 * Production Printful Webhook Security, Verification, Log Storage, and Handler Module.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PRINTFUL_WEBHOOK_EVENTS, type PrintfulWebhookEventType } from "./constants";
import type { PrintfulWebhookPayload, PrintfulOrder, PrintfulOrderShipment } from "./types";
export type { PrintfulWebhookPayload };
import { getOrderById } from "@/lib/orders";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { notifyAdmin } from "@/lib/notifications/admin";
import { smartSyncEngine } from "@/lib/sync/engine";
import { invalidateProductCache } from "@/lib/cache/smart-cache";
import type { WebhookLogEntry } from "@/lib/sync/types";

const WEBHOOK_LOGS_FILE = path.join(process.cwd(), "data", "webhook-logs.json");

function ensureDataDirExists() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let cachedWebhookLogs: WebhookLogEntry[] | null = null;

export function getWebhookLogs(): WebhookLogEntry[] {
  if (cachedWebhookLogs) return cachedWebhookLogs;
  try {
    ensureDataDirExists();
    if (fs.existsSync(WEBHOOK_LOGS_FILE)) {
      const content = fs.readFileSync(WEBHOOK_LOGS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        cachedWebhookLogs = list;
        return list;
      }
    }
  } catch (err) {
    console.warn("[printful-webhook] Failed to read webhook logs file:", err);
  }
  cachedWebhookLogs = [];
  return [];
}

export function saveWebhookLog(entry: WebhookLogEntry): void {
  try {
    ensureDataDirExists();
    const logs = getWebhookLogs();
    const updated = [entry, ...logs].slice(0, 100);
    fs.writeFileSync(WEBHOOK_LOGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    cachedWebhookLogs = updated;
  } catch (err) {
    console.error("[printful-webhook] Failed to save webhook log:", err);
  }
}

/**
 * Helper to generate HMAC SHA256 signature for test validation.
 */
export function generatePrintfulSignature(rawBody: string, secret?: string): string {
  const webhookSecret = secret || process.env.PRINTFUL_WEBHOOK_SECRET || "default_printful_webhook_secret_key_2026";
  return crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
}

/**
 * Verifies Printful webhook HMAC SHA256 signature.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.PRINTFUL_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      "[printful-webhook] PRINTFUL_WEBHOOK_SECRET is not configured. Allowing event in dry-run mode."
    );
    return true;
  }

  if (!signatureHeader) {
    console.warn("[printful-webhook] Missing signature header on incoming webhook request.");
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    const cleanSignature = signatureHeader.replace(/^sha256=/, "").trim();

    const buf1 = Buffer.from(computedSignature, "hex");
    const buf2 = Buffer.from(cleanSignature, "hex");

    if (buf1.length !== buf2.length) {
      return false;
    }

    return crypto.timingSafeEqual(buf1, buf2);
  } catch (err) {
    console.error("[printful-webhook] Webhook signature verification error:", err);
    return false;
  }
}

export interface PrintfulWebhookHandlerResult {
  handled: boolean;
  event: string;
  orderId?: string;
  message: string;
}

/**
 * Routes and handles incoming Printful webhook event payloads.
 */
export async function handleWebhookEvent(
  payload: PrintfulWebhookPayload
): Promise<PrintfulWebhookHandlerResult> {
  const eventType = payload.type as PrintfulWebhookEventType;
  const logId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.info(`[printful-webhook] Received Webhook Event: ${eventType} (Store ID: ${payload.store})`);

  let result: PrintfulWebhookHandlerResult;
  let status: "processed" | "failed" = "processed";
  let errorMsg: string | undefined;

  try {
    switch (eventType) {
      case PRINTFUL_WEBHOOK_EVENTS.PACKAGE_SHIPPED:
        result = await handlePackageShipped(payload as PrintfulWebhookPayload<{ order: PrintfulOrder; shipment: PrintfulOrderShipment }>);
        break;

      case PRINTFUL_WEBHOOK_EVENTS.ORDER_CREATED:
        result = await handleOrderCreated(payload as PrintfulWebhookPayload<{ order: PrintfulOrder }>);
        break;

      case PRINTFUL_WEBHOOK_EVENTS.ORDER_UPDATED:
        result = await handleOrderUpdated(payload as PrintfulWebhookPayload<{ order: PrintfulOrder }>);
        break;

      case PRINTFUL_WEBHOOK_EVENTS.ORDER_FAILED:
      case PRINTFUL_WEBHOOK_EVENTS.ORDER_CANCELED:
        result = await handleOrderFailed(payload as PrintfulWebhookPayload<{ order: PrintfulOrder; reason?: string }>);
        break;

      case PRINTFUL_WEBHOOK_EVENTS.PRODUCT_UPDATED:
      case PRINTFUL_WEBHOOK_EVENTS.STOCK_UPDATED:
        result = await handleProductUpdated(payload);
        break;

      case PRINTFUL_WEBHOOK_EVENTS.SYNC_PRODUCT_DELETED:
      case PRINTFUL_WEBHOOK_EVENTS.PRODUCT_DELETED:
        result = await handleProductDeleted(payload);
        break;

      default:
        console.info(`[printful-webhook] Unhandled event type: ${eventType}. Acknowledged.`);
        result = { handled: true, event: eventType, message: `Event ${eventType} acknowledged.` };
        break;
    }
  } catch (err: unknown) {
    status = "failed";
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[printful-webhook] Webhook ${eventType} failed:`, errorMsg);
    result = { handled: false, event: eventType, message: `Failed: ${errorMsg}` };
  }

  saveWebhookLog({
    id: logId,
    event: eventType,
    receivedAt: new Date().toISOString(),
    status,
    retryCount: payload.retries || 0,
    payload: (payload.data as Record<string, unknown>) || {},
    error: errorMsg,
  });

  return result;
}

async function handlePackageShipped(
  payload: PrintfulWebhookPayload<{ order: PrintfulOrder; shipment: PrintfulOrderShipment }>
): Promise<PrintfulWebhookHandlerResult> {
  const order = payload.data?.order;
  const shipment = payload.data?.shipment;
  const externalId = order?.external_id;

  console.info(
    `[printful-webhook] Shipment sent for Printful Order #${order?.id} (Store External ID: ${externalId}). Tracking: ${shipment?.carrier} ${shipment?.tracking_number}`
  );

  if (externalId) {
    try {
      const dbOrder = await getOrderById(externalId);
      if (dbOrder) {
        const supabase = createAdminSupabaseClient();
        await supabase
          .from("orders")
          .update({
            fulfillment_status: "shipped",
            status: "shipped",
            tracking_number: shipment?.tracking_number || null,
            shipping_carrier: shipment?.carrier || null,
            synced_at: new Date().toISOString(),
          })
          .eq("id", dbOrder.id);

        await supabase.from("order_status_history").insert({
          order_id: dbOrder.id,
          old_status: dbOrder.status,
          new_status: "shipped",
          note: `Package shipped via Printful (${shipment?.carrier || "Standard"} - Tracking: ${shipment?.tracking_number || "N/A"})`,
          changed_by: "printful_webhook",
        });
      }
    } catch (err) {
      console.error(`[printful-webhook] Failed to update local DB order status for external ID ${externalId}:`, err);
    }
  }

  return {
    handled: true,
    event: PRINTFUL_WEBHOOK_EVENTS.PACKAGE_SHIPPED,
    orderId: externalId || String(order?.id),
    message: `Package shipped webhook processed successfully.`,
  };
}

async function handleOrderCreated(
  payload: PrintfulWebhookPayload<{ order: PrintfulOrder }>
): Promise<PrintfulWebhookHandlerResult> {
  const order = payload.data?.order;
  console.info(`[printful-webhook] Printful Order #${order?.id} created.`);
  return {
    handled: true,
    event: PRINTFUL_WEBHOOK_EVENTS.ORDER_CREATED,
    orderId: order?.external_id || String(order?.id),
    message: `Order created webhook processed.`,
  };
}

async function handleOrderUpdated(
  payload: PrintfulWebhookPayload<{ order: PrintfulOrder }>
): Promise<PrintfulWebhookHandlerResult> {
  const order = payload.data?.order;
  console.info(`[printful-webhook] Printful Order #${order?.id} updated status: ${order?.status}.`);
  return {
    handled: true,
    event: PRINTFUL_WEBHOOK_EVENTS.ORDER_UPDATED,
    orderId: order?.external_id || String(order?.id),
    message: `Order updated webhook processed.`,
  };
}

async function handleOrderFailed(
  payload: PrintfulWebhookPayload<{ order: PrintfulOrder; reason?: string }>
): Promise<PrintfulWebhookHandlerResult> {
  const order = payload.data?.order;
  const reason = payload.data?.reason || "Fulfillment issue on Printful side";
  const externalId = order?.external_id;

  console.warn(`[printful-webhook] Printful Order #${order?.id} failed: ${reason}`);

  await notifyAdmin({
    type: "webhook_failed",
    title: "Printful Fulfillment Failed",
    message: `Order #${externalId || order?.id} failed during Printful processing: ${reason}`,
    metadata: { printfulOrderId: order?.id, externalId, reason },
  });

  return {
    handled: true,
    event: PRINTFUL_WEBHOOK_EVENTS.ORDER_FAILED,
    orderId: externalId || String(order?.id),
    message: `Order failed webhook logged and admin notified.`,
  };
}

async function handleProductUpdated(
  payload: PrintfulWebhookPayload
): Promise<PrintfulWebhookHandlerResult> {
  const data = (payload.data as Record<string, any>) || {};
  const syncProductId = data?.sync_product?.id || data?.product?.id || data?.sync_product_id;

  console.info(`[printful-webhook] Product update webhook triggered for product ID: ${syncProductId}`);

  if (syncProductId) {
    try {
      await smartSyncEngine.syncSingleProduct(Number(syncProductId));
      invalidateProductCache();
    } catch (err) {
      console.error(`[printful-webhook] Failed to auto-sync product ${syncProductId}:`, err);
    }
  }

  return {
    handled: true,
    event: payload.type,
    message: `Product update webhook processed for product ${syncProductId || "unknown"}.`,
  };
}

async function handleProductDeleted(
  payload: PrintfulWebhookPayload
): Promise<PrintfulWebhookHandlerResult> {
  const data = (payload.data as Record<string, any>) || {};
  const syncProductId = data?.sync_product?.id || data?.product?.id || data?.sync_product_id;

  console.info(`[printful-webhook] Product deletion webhook triggered for product ID: ${syncProductId}`);

  if (syncProductId) {
    try {
      await smartSyncEngine.deleteSyncedProduct(syncProductId);
      invalidateProductCache();
    } catch (err) {
      console.error(`[printful-webhook] Failed to delete product ${syncProductId}:`, err);
    }
  }

  return {
    handled: true,
    event: payload.type,
    message: `Product deletion webhook processed for product ${syncProductId || "unknown"}.`,
  };
}
