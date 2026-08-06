/**
 * app/api/printful/webhook/route.ts
 *
 * API Route: POST /api/printful/webhook - Secure Webhook listener for Printful events.
 */

import { NextResponse } from "next/server";
import { verifyWebhookSignature, handleWebhookEvent } from "@/lib/printful/webhook";
import type { PrintfulWebhookPayload } from "@/lib/printful/types";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-printful-signature") || request.headers.get("x-pf-signature");

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.warn("[printful-webhook-route] Rejected webhook due to invalid signature.");
      return NextResponse.json({ success: false, error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: PrintfulWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "Malformed JSON payload" }, { status: 400 });
    }

    const result = await handleWebhookEvent(payload);

    return NextResponse.json({
      success: true,
      handled: result.handled,
      event: result.event,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error processing Printful webhook";
    console.error("[printful-webhook-route] Webhook error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
