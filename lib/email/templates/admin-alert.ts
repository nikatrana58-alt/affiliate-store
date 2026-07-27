import { renderBaseEmailTemplate } from "./base";

export type AdminAlertType =
  | "new_order"
  | "payment_failed"
  | "refund_requested"
  | "low_inventory"
  | "cj_failed"
  | "webhook_failed";

export function renderAdminAlertEmail(
  type: AdminAlertType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): string {
  const bodyContentHtml = `
    <div style="background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 12px; padding: 12px; font-size: 11px; color: #FF6B6B; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">
      SYSTEM ALERT: ${type.toUpperCase().replace("_", " ")}
    </div>

    <h2 style="margin: 0 0 8px; font-size: 20px; color: #FFFFFF;">${title}</h2>
    <p style="margin: 0 0 16px; color: #94A3B8; font-size: 14px; line-height: 1.5;">
      ${message}
    </p>

    ${
      metadata
        ? `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; font-family: monospace; font-size: 12px; color: #C9A84C; margin-bottom: 20px; word-break: break-all;">
            ${JSON.stringify(metadata, null, 2)}
          </div>`
        : ""
    }

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://curatedfinds.store"}/admin" class="btn-gold">
        Open Admin Console ↗
      </a>
    </div>
  `;

  return renderBaseEmailTemplate({
    title: `Admin Alert: ${title}`,
    preheader: message,
    bodyContentHtml,
  });
}
