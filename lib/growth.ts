/**
 * lib/growth.ts
 *
 * Repository functions for Growth Systems:
 * - Reviews & Ratings
 * - Gift Cards & Balance Tracking
 * - Referral Program
 * - Loyalty Points & VIP Tiers
 * - Abandoned Cart Recovery
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/service";
import { renderBaseEmailTemplate } from "@/lib/email/templates/base";

export type ProductReview = {
  id: string;
  product_id: string;
  customer_email: string;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified: boolean;
  is_approved: boolean;
  helpful_votes: number;
  created_at: string;
};

export type GiftCard = {
  id: string;
  code: string;
  initial_value: number;
  current_balance: number;
  purchaser_email: string;
  recipient_email?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
};

export type LoyaltyAccount = {
  id: string;
  customer_email: string;
  points_balance: number;
  lifetime_points: number;
  vip_tier: "Silver" | "Gold" | "Platinum";
  created_at: string;
};

// ─── 1. REVIEWS & RATINGS ───────────────────────────────────────────────────

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[growth] product_reviews query notice:", error.message);
      return [];
    }
    return (data ?? []) as unknown as ProductReview[];
  } catch (err) {
    console.warn("[growth] product_reviews exception:", err);
    return [];
  }
}

export async function submitProductReview(
  productId: string,
  input: {
    customer_email: string;
    customer_name: string;
    rating: number;
    title: string;
    comment: string;
  }
): Promise<ProductReview> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = input.customer_email.toLowerCase().trim();

  // Check if customer purchased product to assign verified badge
  const { data: purchase } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_email", normalizedEmail)
    .eq("status", "delivered")
    .maybeSingle();

  const { data, error } = await supabase
    .from("product_reviews")
    .insert({
      product_id: productId,
      customer_email: normalizedEmail,
      customer_name: input.customer_name,
      rating: Math.min(Math.max(input.rating, 1), 5),
      title: input.title,
      comment: input.comment,
      is_verified: Boolean(purchase),
      is_approved: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ProductReview;
}

export async function voteReviewHelpful(reviewId: string): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { data: review } = await supabase
    .from("product_reviews")
    .select("helpful_votes")
    .eq("id", reviewId)
    .single();

  const newVotes = (review?.helpful_votes || 0) + 1;

  await supabase
    .from("product_reviews")
    .update({ helpful_votes: newVotes })
    .eq("id", reviewId);

  return newVotes;
}

// ─── 2. GIFT CARDS ──────────────────────────────────────────────────────────

export async function getGiftCard(code: string): Promise<GiftCard | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as GiftCard | null;
}

export async function applyGiftCard(code: string, amount: number): Promise<{ success: boolean; appliedAmount: number; remainingBalance: number }> {
  const card = await getGiftCard(code);
  if (!card || card.current_balance <= 0) {
    throw new Error("Invalid or empty gift card code.");
  }

  const appliedAmount = Math.min(card.current_balance, amount);
  const remainingBalance = card.current_balance - appliedAmount;

  const supabase = createAdminSupabaseClient();
  await supabase
    .from("gift_cards")
    .update({
      current_balance: remainingBalance,
      is_active: remainingBalance > 0,
    })
    .eq("id", card.id);

  return { success: true, appliedAmount, remainingBalance };
}

// ─── 3. REFERRALS ───────────────────────────────────────────────────────────

export async function getOrCreateReferralCode(email: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_email", normalizedEmail)
    .maybeSingle();

  if (existing) return existing.referral_code;

  const code = `REF-${normalizedEmail.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  await supabase.from("referrals").insert({
    referrer_email: normalizedEmail,
    referral_code: code,
    reward_amount: 10.0,
  });

  return code;
}

// ─── 4. LOYALTY PROGRAM & VIP TIERS ─────────────────────────────────────────

export async function getLoyaltyAccount(email: string): Promise<LoyaltyAccount> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("loyalty_accounts")
    .select("*")
    .eq("customer_email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as unknown as LoyaltyAccount;

  // Create new loyalty account
  const { data: created, error: createErr } = await supabase
    .from("loyalty_accounts")
    .insert({
      customer_email: normalizedEmail,
      points_balance: 50, // 50 bonus points on signup
      lifetime_points: 50,
      vip_tier: "Silver",
    })
    .select()
    .single();

  if (createErr) throw createErr;
  return created as unknown as LoyaltyAccount;
}

export async function awardLoyaltyPoints(email: string, amountSpent: number): Promise<LoyaltyAccount> {
  const account = await getLoyaltyAccount(email);
  const earnedPoints = Math.floor(amountSpent); // 1 point per $1 spent
  const newLifetime = account.lifetime_points + earnedPoints;
  const newBalance = account.points_balance + earnedPoints;

  let newTier: "Silver" | "Gold" | "Platinum" = "Silver";
  if (newLifetime >= 1000) newTier = "Platinum";
  else if (newLifetime >= 500) newTier = "Gold";

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_accounts")
    .update({
      points_balance: newBalance,
      lifetime_points: newLifetime,
      vip_tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as LoyaltyAccount;
}

// ─── 5. ABANDONED CART RECOVERY ─────────────────────────────────────────────

export async function trackAbandonedCart(email: string, items: unknown[], subtotal: number): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const token = `cart_${Math.random().toString(36).slice(2, 11)}`;

  await supabase.from("abandoned_carts").insert({
    customer_email: email.toLowerCase().trim(),
    cart_items: items,
    subtotal,
    recovery_token: token,
  });

  return token;
}

export async function processAbandonedCartReminders(): Promise<{ countSent: number }> {
  const supabase = createAdminSupabaseClient();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const { data: pendingCarts } = await supabase
    .from("abandoned_carts")
    .select("*")
    .eq("reminder_sent", false)
    .eq("recovered", false)
    .lt("created_at", oneHourAgo);

  if (!pendingCarts || pendingCarts.length === 0) return { countSent: 0 };

  let countSent = 0;

  for (const cart of pendingCarts) {
    const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://curatedfinds.store"}/checkout?recover=${cart.recovery_token}`;

    const bodyContentHtml = `
      <h2 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">You Left Something Special in Your Cart!</h2>
      <p style="margin: 0 0 20px; color: #94A3B8; font-size: 14px;">
        Items in your shopping bag are selling fast. Return now to complete your order with free priority shipping.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${recoveryUrl}" class="btn-gold">
          Complete Your Purchase ↗
        </a>
      </div>
    `;

    const html = renderBaseEmailTemplate({
      title: "Complete Your Purchase - Curated Finds",
      preheader: "Items in your cart are waiting for you!",
      bodyContentHtml,
      customerEmail: cart.customer_email,
    });

    const res = await sendEmail({
      to: cart.customer_email,
      subject: "Did you forget something? Complete your order today",
      html,
      eventType: "abandoned_cart_reminder",
    });

    if (res.success) {
      countSent++;
      await supabase.from("abandoned_carts").update({ reminder_sent: true }).eq("id", cart.id);
    }
  }

  return { countSent };
}
