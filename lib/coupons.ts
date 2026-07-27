/**
 * lib/coupons.ts
 *
 * Repository and validation layer for the `coupons` table.
 * All database access uses the service-role client.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import type { Coupon } from "@/lib/db/types";
export type { Coupon } from "@/lib/db/types";

const COLS =
  "id,code,description,discount_type,discount_value,minimum_order," +
  "max_uses,uses_count,is_active,expires_at,created_at,updated_at";

// ─── Repository ──────────────────────────────────────────────────────────────

/**
 * Fetches a coupon by code (case-insensitive).
 * Returns null if not found.
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("coupons")
    .select(COLS)
    .ilike("code", code.trim())
    .maybeSingle();

  if (error) throw error;
  return data as Coupon | null;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type CouponValidationResult =
  | { valid: true; coupon: Coupon; discountAmount: number }
  | { valid: false; reason: string };

/**
 * Validates a coupon code against the current order subtotal.
 * Does NOT mutate uses_count — that happens when the order is committed.
 */
export async function validateCoupon(
  code: string,
  orderSubtotal: number
): Promise<CouponValidationResult> {
  let coupon: Coupon | null;

  try {
    coupon = await getCouponByCode(code);
  } catch {
    return { valid: false, reason: "Unable to validate coupon at this time." };
  }

  if (!coupon) {
    return { valid: false, reason: "Coupon code not found." };
  }

  if (!coupon.is_active) {
    return { valid: false, reason: "This coupon is no longer active." };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, reason: "This coupon has expired." };
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, reason: "This coupon has reached its usage limit." };
  }

  if (orderSubtotal < coupon.minimum_order) {
    return {
      valid: false,
      reason: `This coupon requires a minimum order of $${coupon.minimum_order.toFixed(2)}.`,
    };
  }

  const discountAmount =
    coupon.discount_type === "percentage"
      ? (orderSubtotal * coupon.discount_value) / 100
      : Math.min(coupon.discount_value, orderSubtotal);

  return { valid: true, coupon, discountAmount };
}

/**
 * Increments uses_count for a coupon after a successful order.
 * Fire-and-forget — errors are logged but do not fail the order.
 */
export async function incrementCouponUses(couponId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("increment_coupon_uses", {
    coupon_id: couponId,
  });
  if (error) {
    console.warn("[coupons] Failed to increment uses_count.", error.message);
  }
}
