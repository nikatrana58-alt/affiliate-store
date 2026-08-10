/**
 * lib/notifications/admin.ts
 *
 * System alert module for notifying store admins:
 * - New order received
 * - Payment failed
 * - Refund requested
 * - Low inventory
 * - CJ fulfillment failed
 * - Webhook failed
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/service";
import { renderAdminAlertEmail, type AdminAlertType } from "@/lib/email/templates/admin-alert";

export type AdminNotificationOptions = {
  type: AdminAlertType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

export async function notifyAdmin(options: AdminNotificationOptions): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "admin@curatedfinds.store";

  try {
    // 1. Insert In-App Admin Notification
    try {
      await supabase.from("admin_notifications").insert({
        type: options.type,
        title: options.title,
        message: options.message,
        link: options.link || "/admin",
        metadata: options.metadata || null,
        is_read: false,
      });
    } catch {
      // ignore
    }

    // 2. Dispatch Email Alert to Admin
    const html = renderAdminAlertEmail(options.type, options.title, options.message, options.metadata);
    await sendEmail({
      to: adminEmail,
      subject: `[ADMIN ALERT] ${options.title}`,
      html,
      eventType: `admin_${options.type}`,
      checkPreferences: false,
    });
  } catch (err) {
    console.error("[notifyAdmin] Failed to record admin notification:", err);
  }
}
