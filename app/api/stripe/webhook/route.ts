/**
 * POST /api/stripe/webhook
 *
 * Receives asynchronous webhook events from Stripe.
 * Features:
 * - Signature verification using STRIPE_WEBHOOK_SECRET
 * - Database-backed idempotency using the stripe_events table
 * - Event handling: checkout.session.completed, payment_intent.succeeded,
 *   payment_intent.payment_failed, charge.refunded
 * - Automatic updates for Order and Payment records
 */

import { type NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import {
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentRecord,
} from "@/lib/orders";
import { emitShipmentNotification } from "@/lib/notifications";
import { notifyAdmin } from "@/lib/notifications/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return Response.json(
      { error: "Webhook secret not configured on server." },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown signature verification failure";
    console.error("[stripe-webhook] Signature verification failed:", msg);
    return Response.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // ─── Idempotency Check ──────────────────────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEvent) {
    console.info(`[stripe-webhook] Event ${event.id} already processed. Skipping.`);
    return Response.json({ received: true, duplicate: true });
  }

  // Mark event as processed in stripe_events table
  await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
  });

  console.info(`[stripe-webhook] Processing event ${event.id} [${event.type}]`);

  // ─── Event Processing ───────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          session.metadata?.order_id || session.client_reference_id;

        if (orderId) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          // Update order status to paid
          await updateOrderStatus(orderId, "paid", {
            note: `Payment succeeded via Stripe Checkout Session ${session.id}`,
            changedBy: "stripe_webhook",
          });

          // Update payment record
          await updateOrderPaymentRecord(orderId, {
            gateway: "stripe",
            gateway_payment_id: paymentIntentId ?? session.id,
            gateway_status: session.payment_status,
            status: "succeeded",
            paid_at: new Date().toISOString(),
            metadata: {
              stripe_session_id: session.id,
              stripe_customer_id: session.customer,
            },
          });

          // Emit Order Placed Notification & Email
          const order = await getOrderById(orderId);
          if (order) {
            await emitShipmentNotification({
              type: "order_placed",
              orderId: order.id,
              customerEmail: order.customer_email,
            });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          await updateOrderStatus(orderId, "paid", {
            note: `PaymentIntent ${paymentIntent.id} succeeded`,
            changedBy: "stripe_webhook",
          });

          await updateOrderPaymentRecord(orderId, {
            gateway: "stripe",
            gateway_payment_id: paymentIntent.id,
            gateway_status: paymentIntent.status,
            status: "succeeded",
            paid_at: new Date().toISOString(),
          });

          const order = await getOrderById(orderId);
          if (order) {
            await emitShipmentNotification({
              type: "order_placed",
              orderId: order.id,
              customerEmail: order.customer_email,
            });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          await updateOrderStatus(orderId, "failed", {
            note: `PaymentIntent ${paymentIntent.id} failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
            changedBy: "stripe_webhook",
          });

          await updateOrderPaymentRecord(orderId, {
            gateway: "stripe",
            gateway_payment_id: paymentIntent.id,
            gateway_status: paymentIntent.status,
            status: "failed",
            metadata: {
              error: paymentIntent.last_payment_error?.message || "Payment failed",
            },
          });

          await notifyAdmin({
            type: "payment_failed",
            title: "Stripe Payment Failed",
            message: `Payment failed for Order #${orderId}: ${paymentIntent.last_payment_error?.message || "Card declined"}`,
            metadata: { orderId, error: paymentIntent.last_payment_error },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        let orderId = charge.metadata?.order_id;

        // Lookup order by payment_intent if order_id is not in metadata
        if (!orderId && paymentIntentId) {
          const { data: payment } = await supabase
            .from("payments")
            .select("order_id")
            .eq("gateway_payment_id", paymentIntentId)
            .maybeSingle();

          orderId = payment?.order_id;
        }

        if (orderId) {
          const isFullRefund = charge.refunded;
          const newOrderStatus = isFullRefund ? "refunded" : "paid";
          const newPaymentStatus = isFullRefund ? "refunded" : "partially_refunded";

          await updateOrderStatus(orderId, newOrderStatus, {
            note: `Charge refunded (${isFullRefund ? "full" : "partial"}). Amount: $${(charge.amount_refunded / 100).toFixed(2)}`,
            changedBy: "stripe_webhook",
          });

          await updateOrderPaymentRecord(orderId, {
            gateway: "stripe",
            gateway_payment_id: paymentIntentId ?? charge.id,
            gateway_status: charge.status,
            status: newPaymentStatus,
            refunded_at: new Date().toISOString(),
            metadata: {
              amount_refunded: charge.amount_refunded,
            },
          });
        }
        break;
      }

      default:
        console.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error(`[stripe-webhook] Error processing event ${event.id}:`, error);
    return Response.json(
      { error: "Error processing webhook event." },
      { status: 500 }
    );
  }
}
