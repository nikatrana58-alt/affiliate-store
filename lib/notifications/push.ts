/**
 * lib/notifications/push.ts
 *
 * Backend Architecture for Web Push & Mobile Push Notifications.
 * Ready for future WebPush VAPID / Firebase Cloud Messaging (FCM) integration.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";

export type PushSubscriptionInput = {
  customerEmail: string;
  endpoint: string;
  keysP256dh?: string;
  keysAuth?: string;
  userAgent?: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
};

/**
 * Registers a new Web/Mobile Push subscription.
 */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      customer_email: input.customerEmail.toLowerCase().trim(),
      endpoint: input.endpoint,
      keys_p256dh: input.keysP256dh || null,
      keys_auth: input.keysAuth || null,
      user_agent: input.userAgent || null,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;
}

/**
 * Dispatches a push notification to all active devices subscribed for a customer.
 */
export async function sendPushNotification(
  customerEmail: string,
  payload: PushNotificationPayload
): Promise<{ sentCount: number }> {
  const supabase = createAdminSupabaseClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("customer_email", customerEmail.toLowerCase().trim());

  if (error) throw error;
  if (!subs || subs.length === 0) return { sentCount: 0 };

  console.info(`[PushArchitecture] Dispatching push notification to ${subs.length} device(s) for ${customerEmail}:`, payload);

  // Future VAPID / FCM dispatch hook point
  return { sentCount: subs.length };
}
