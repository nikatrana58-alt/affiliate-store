/**
 * lib/notifications.ts
 *
 * Integrated Event Notification System:
 * - Creates in-app customer notifications
 * - Renders and dispatches responsive HTML email templates
 * - Triggers admin system alerts
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/service";
import { renderOrderConfirmationEmail } from "@/lib/email/templates/order-confirmation";
import { renderShipmentUpdateEmail } from "@/lib/email/templates/shipment-update";
import { renderAccountAuthEmail, type AuthEmailType } from "@/lib/email/templates/account-auth";
import { notifyAdmin } from "@/lib/notifications/admin";
import { getOrderById } from "@/lib/orders";

export type NotificationType =
  | "order_placed"
  | "order_shipped"
  | "out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "refund_issued";

export type NotificationEventPayload = {
  type: NotificationType;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
};

/**
 * Handles shipment milestone events: in-app notification + email dispatch + admin alert.
 */
export async function emitShipmentNotification(payload: NotificationEventPayload): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const order = await getOrderById(payload.orderId);

  const titles: Record<NotificationType, { title: string; body: string }> = {
    order_placed: { title: "Order Confirmed!", body: `Your order #${payload.orderId.slice(0, 8)} has been placed.` },
    order_shipped: { title: "Order Shipped!", body: `Your package #${payload.orderId.slice(0, 8)} is in transit with ${payload.shippingCarrier || "Carrier"}.` },
    out_for_delivery: { title: "Out for Delivery!", body: `Package #${payload.orderId.slice(0, 8)} is scheduled to arrive today.` },
    order_delivered: { title: "Order Delivered!", body: `Package #${payload.orderId.slice(0, 8)} has been delivered.` },
    order_cancelled: { title: "Order Cancelled", body: `Order #${payload.orderId.slice(0, 8)} has been cancelled.` },
    refund_issued: { title: "Refund Processed", body: `Refund issued for Order #${payload.orderId.slice(0, 8)}.` },
  };

  const info = titles[payload.type];

  // 1. Create In-App Notification
  try {
    await supabase.from("customer_notifications").insert({
      customer_email: payload.customerEmail.toLowerCase().trim(),
      type: payload.type.includes("ship") || payload.type.includes("delivery") ? "shipping" : "order_update",
      title: info.title,
      message: info.body,
      link: `/orders/${payload.orderId}?email=${encodeURIComponent(payload.customerEmail)}`,
      is_read: false,
    });
  } catch (err) {
    console.error("[emitShipmentNotification] Failed to create in-app notification:", err);
  }

  // 2. Dispatch HTML Email
  if (order) {
    if (payload.type === "order_placed") {
      const html = renderOrderConfirmationEmail(order);
      await sendEmail({
        to: payload.customerEmail,
        subject: `Order Confirmation #${order.id.slice(0, 8)}`,
        html,
        eventType: "order_placed",
      });

      // Admin alert for new order
      await notifyAdmin({
        type: "new_order",
        title: `New Order Received: #${order.id.slice(0, 8)}`,
        message: `Order of $${order.grand_total} placed by ${order.customer_email}`,
        metadata: { orderId: order.id, total: order.grand_total },
      });
    } else if (["order_shipped", "out_for_delivery", "order_delivered"].includes(payload.type)) {
      const emailType = payload.type === "order_shipped" ? "shipped" : payload.type === "out_for_delivery" ? "out_for_delivery" : "delivered";
      const html = renderShipmentUpdateEmail(order, emailType);
      await sendEmail({
        to: payload.customerEmail,
        subject: `${info.title} - #${order.id.slice(0, 8)}`,
        html,
        eventType: payload.type,
      });
    }
  }
}

/**
 * Dispatches account authentication emails (Welcome, Verification, Password Reset).
 */
export async function sendAuthEmail(email: string, type: AuthEmailType, actionLink?: string): Promise<void> {
  const titles: Record<AuthEmailType, string> = {
    welcome: "Welcome to RA2Z Luxury",
    verification: "Verify Your Email Address",
    password_reset: "Reset Your Password",
  };

  const html = renderAccountAuthEmail(email, type, actionLink);
  await sendEmail({
    to: email,
    subject: titles[type],
    html,
    eventType: `auth_${type}`,
    checkPreferences: false,
  });
}
