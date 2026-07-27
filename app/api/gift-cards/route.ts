/**
 * POST /api/gift-cards
 *
 * Validates and applies gift card balance to checkout total.
 */

import { type NextRequest } from "next/server";
import { applyGiftCard, getGiftCard } from "@/lib/growth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      amount?: number;
      action?: "check" | "apply";
    };

    if (!body.code) {
      return Response.json({ error: "Gift card code is required." }, { status: 400 });
    }

    if (body.action === "apply" && body.amount) {
      const result = await applyGiftCard(body.code, body.amount);
      return Response.json(result);
    }

    const card = await getGiftCard(body.code);
    if (!card) {
      return Response.json({ error: "Invalid or inactive gift card code." }, { status: 404 });
    }

    return Response.json({ success: true, giftCard: card });
  } catch (error) {
    console.error("[api/gift-cards] POST failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Gift card operation failed." },
      { status: 500 }
    );
  }
}
