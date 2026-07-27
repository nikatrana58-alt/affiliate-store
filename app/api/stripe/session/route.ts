/**
 * POST /api/stripe/session
 *
 * Creates a Stripe Hosted Checkout Session for a given pending order ID.
 * Returns the hosted checkout session URL for browser redirect.
 */

import { type NextRequest } from "next/server";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return Response.json(
        {
          error:
            "Online card payment is currently in preview mode. Stripe API keys are not yet configured on this environment.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { orderId?: string };

    if (!body.orderId || typeof body.orderId !== "string") {
      return Response.json(
        { error: "Missing or invalid orderId in request body." },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      "http://localhost:3000";

    const session = await createCheckoutSession(body.orderId, origin);

    if (!session.url) {
      return Response.json(
        { error: "Stripe checkout session URL was not generated." },
        { status: 500 }
      );
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("[api/stripe/session] Checkout session creation failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to initiate payment session." },
      { status: 500 }
    );
  }
}
