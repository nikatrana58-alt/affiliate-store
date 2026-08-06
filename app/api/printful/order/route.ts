/**
 * app/api/printful/order/route.ts
 *
 * API Route: POST /api/printful/order - Submit an order to Printful with Zod validation.
 * API Route: GET /api/printful/order?id=... - Fetch details for an existing Printful order.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { printfulClient } from "@/lib/printful/client";
import { PrintfulOrderInputSchema } from "@/lib/printful/validation";
import { PrintfulError } from "@/lib/printful/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get("confirm") === "true";

    const parsed = PrintfulOrderInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Order validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const order = await printfulService.createOrder(parsed.data, confirm);

    return NextResponse.json(
      {
        success: true,
        message: confirm ? "Printful order created and confirmed for fulfillment" : "Printful draft order created",
        order,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to create order on Printful";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID parameter is required" }, { status: 400 });
    }

    const order = await printfulClient.getOrder(id);
    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to retrieve Printful order";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
