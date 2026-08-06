import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent, verifyWebhookSignature, type PrintfulWebhookPayload } from "@/lib/printful/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-printful-signature");

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.warn("[printful-webhook] Unauthorized webhook attempt - invalid HMAC signature.");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    let payload: PrintfulWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const result = await handleWebhookEvent(payload);

    return NextResponse.json({
      success: true,
      handled: result.handled,
      event: result.event,
      message: result.message,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[printful-webhook] Fatal error handling webhook:", error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
