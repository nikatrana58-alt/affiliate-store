import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, reason: "Please enter a promo code." },
        { status: 400 }
      );
    }

    const numericSubtotal = typeof subtotal === "number" && !isNaN(subtotal) ? subtotal : 0;
    const result = await validateCoupon(code.trim(), numericSubtotal);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        reason: "Invalid promo code. Please check and try again.",
      });
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discount_type,
      discountValue: result.coupon.discount_value,
      discountAmount: result.discountAmount,
    });
  } catch (error: any) {
    console.error("[api/coupons/validate] Error:", error);
    return NextResponse.json(
      { valid: false, reason: "Invalid promo code. Please check and try again." },
      { status: 500 }
    );
  }
}
