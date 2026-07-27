import { renderBaseEmailTemplate } from "./base";
import type { Order } from "@/lib/db/types";

export type ShipmentEmailType = "shipped" | "out_for_delivery" | "delivered";

export function renderShipmentUpdateEmail(order: Order, type: ShipmentEmailType): string {
  const getTitles = () => {
    switch (type) {
      case "shipped":
        return {
          header: "Your Order Has Shipped!",
          message: "Great news! Your package has been dispatched and is currently in transit with the carrier.",
        };
      case "out_for_delivery":
        return {
          header: "Out for Delivery Today!",
          message: "Your shipment is on the courier vehicle and scheduled to arrive today.",
        };
      case "delivered":
        return {
          header: "Order Delivered!",
          message: "Your package has been successfully delivered. Enjoy your curated items!",
        };
    }
  };

  const info = getTitles();

  const bodyContentHtml = `
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">${info.header}</h2>
    <p style="margin: 0 0 20px; color: #94A3B8; font-size: 14px;">
      Hello ${order.customer_first_name}, ${info.message}
    </p>

    <div style="background: rgba(77, 150, 255, 0.08); border: 1px solid rgba(77, 150, 255, 0.25); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #4D96FF; letter-spacing: 1px;">Shipment Carrier & Tracking</div>
      <div style="font-size: 16px; color: #FFFFFF; font-weight: 700; margin-top: 4px;">
        ${order.shipping_carrier || "Carrier Packet"} — <code style="color: #C9A84C;">${order.tracking_number || "Pending"}</code>
      </div>
      ${
        order.estimated_delivery
          ? `<div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">Estimated Delivery: ${new Date(order.estimated_delivery).toLocaleDateString()}</div>`
          : ""
      }
    </div>

    <div style="text-align: center;">
      <a href="${order.tracking_url || `https://www.17track.net/en/track?nums=${order.tracking_number}`}" class="btn-gold">
        Track Package Live ↗
      </a>
    </div>
  `;

  return renderBaseEmailTemplate({
    title: `${info.header} - Order #${order.id.slice(0, 8)}`,
    preheader: info.message,
    bodyContentHtml,
    customerEmail: order.customer_email,
  });
}
