import { renderBaseEmailTemplate } from "./base";
import type { OrderWithItems } from "@/lib/db/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(price);
}

export function renderOrderConfirmationEmail(order: OrderWithItems): string {
  const itemsHtml = order.order_items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <strong>${item.product_title}</strong> × ${item.quantity}
        </td>
        <td style="padding: 8px 0; font-size: 14px; text-align: right; color: #C9A84C; border-bottom: 1px solid rgba(255,255,255,0.05);">
          ${formatPrice(item.unit_price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const bodyContentHtml = `
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">Order Confirmed!</h2>
    <p style="margin: 0 0 20px; color: #94A3B8; font-size: 14px;">
      Thank you for your purchase, ${order.customer_first_name}. Your order has been placed successfully and is being prepared for fulfillment.
    </p>

    <div style="background: rgba(201, 168, 76, 0.08); border: 1px solid rgba(201, 168, 76, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #C9A84C; letter-spacing: 1px;">Order Reference</div>
      <div style="font-family: monospace; font-size: 15px; color: #FFFFFF; font-weight: 700; margin-top: 4px;">#${order.id}</div>
    </div>

    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th align="left" style="padding-bottom: 8px; font-size: 12px; color: #94A3B8; text-transform: uppercase;">Item</th>
          <th align="right" style="padding-bottom: 8px; font-size: 12px; color: #94A3B8; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px; font-size: 14px;">
      <tr>
        <td style="color: #94A3B8; padding: 4px 0;">Subtotal</td>
        <td align="right" style="color: #FFFFFF; padding: 4px 0;">${formatPrice(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="color: #94A3B8; padding: 4px 0;">Shipping</td>
        <td align="right" style="color: #FFFFFF; padding: 4px 0;">${formatPrice(order.shipping_cost)}</td>
      </tr>
      <tr>
        <td style="color: #94A3B8; padding: 4px 0;">Tax</td>
        <td align="right" style="color: #FFFFFF; padding: 4px 0;">${formatPrice(order.tax_amount)}</td>
      </tr>
      <tr>
        <td style="color: #C9A84C; font-weight: 700; padding-top: 8px; font-size: 16px;">Grand Total</td>
        <td align="right" style="color: #C9A84C; font-weight: 700; padding-top: 8px; font-size: 16px;">${formatPrice(order.grand_total)}</td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://curatedfinds.store"}/orders/${order.id}?email=${encodeURIComponent(order.customer_email)}" class="btn-gold">
        Track Your Order & View Details ↗
      </a>
    </div>
  `;

  return renderBaseEmailTemplate({
    title: `Order Confirmation #${order.id.slice(0, 8)}`,
    preheader: `Thank you for your order #${order.id.slice(0, 8)}. We are preparing your shipment!`,
    bodyContentHtml,
    customerEmail: order.customer_email,
  });
}
