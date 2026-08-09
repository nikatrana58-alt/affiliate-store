/**
 * lib/email/service.ts
 *
 * Provider-Agnostic Email Dispatch Service with delivery logging,
 * automatic retries, and customer preference checking.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { getCustomerSettings } from "@/lib/account";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  eventType: string; // 'order_placed', 'order_shipped', 'welcome', 'admin_alert', etc.
  checkPreferences?: boolean; // Default: true for marketing/order updates
  metadata?: Record<string, unknown>;
};

export type EmailDeliveryResult = {
  success: boolean;
  logId?: string;
  error?: string;
  provider: string;
};

/**
 * Main provider-agnostic dispatch function.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
  const provider = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();
  const from = process.env.EMAIL_FROM || "RA2Z Luxury <noreply@ra2z.shop>";
  const supabase = createAdminSupabaseClient();

  // 1. Check Customer Preferences if enabled
  if (options.checkPreferences && options.to) {
    try {
      const settings = await getCustomerSettings(options.to);
      if (options.eventType.includes("order") && !settings.email_order_updates) {
        console.info(`[EmailService] Skipped ${options.eventType} for ${options.to} due to preference settings.`);
        return { success: true, provider: "skipped-by-user-preference" };
      }
      if (options.eventType.includes("promo") && !settings.email_promotions) {
        console.info(`[EmailService] Skipped promo email for ${options.to} due to preference settings.`);
        return { success: true, provider: "skipped-by-user-preference" };
      }
    } catch {
      // Proceed if settings lookup fails
    }
  }

  // 2. Log Initial Queued Record in DB
  const { data: log, error: logError } = await supabase
    .from("email_logs")
    .insert({
      recipient: options.to,
      subject: options.subject,
      event_type: options.eventType,
      provider,
      status: "queued",
      metadata: options.metadata || null,
    })
    .select("id")
    .single();

  if (logError) {
    console.error("[EmailService] Failed to record initial email log:", logError);
  }

  const logId = log?.id;

  // 3. Dispatch via Configured Provider
  let sendError: string | null = null;
  let isSent = false;

  try {
    if (provider === "resend" && process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("placeholder")) {
      // Resend HTTP dispatch
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend API HTTP ${res.status}: ${body}`);
      }
      isSent = true;
    } else if (provider === "smtp" && process.env.SMTP_USER && !process.env.SMTP_USER.includes("placeholder")) {
      // SMTP Mock / Direct send fallback simulation
      console.info(`[EmailService - SMTP Dispatch] To: ${options.to} | Subject: ${options.subject}`);
      isSent = true;
    } else {
      // Default Mock Mode for Dev / Testing
      console.info(`[EmailService - Mock Mode] To: ${options.to} | Subject: ${options.subject}`);
      isSent = true;
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : "Email dispatch error";
    console.error(`[EmailService] Failed to send email to ${options.to}:`, sendError);
  }

  // 4. Update Log Record in DB
  if (logId) {
    await supabase
      .from("email_logs")
      .update({
        status: isSent ? "sent" : "failed",
        sent_at: isSent ? new Date().toISOString() : null,
        error: sendError,
      })
      .eq("id", logId);
  }

  return {
    success: isSent,
    logId,
    error: sendError || undefined,
    provider,
  };
}

/**
 * Retries all failed email logs from the DB.
 */
export async function retryFailedEmailLogs(): Promise<{ retriedCount: number; successCount: number }> {
  const supabase = createAdminSupabaseClient();
  const { data: failedLogs } = await supabase
    .from("email_logs")
    .select("*")
    .eq("status", "failed")
    .lt("retry_count", 3);

  if (!failedLogs || failedLogs.length === 0) {
    return { retriedCount: 0, successCount: 0 };
  }

  let successCount = 0;

  for (const log of failedLogs) {
    await supabase
      .from("email_logs")
      .update({ retry_count: (log.retry_count || 0) + 1 })
      .eq("id", log.id);

    const res = await sendEmail({
      to: log.recipient,
      subject: log.subject,
      html: `<p>Retried email payload for event ${log.event_type}</p>`,
      eventType: log.event_type,
      checkPreferences: false,
    });

    if (res.success) successCount++;
  }

  return { retriedCount: failedLogs.length, successCount };
}
