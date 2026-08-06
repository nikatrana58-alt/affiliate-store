/**
 * app/api/printful/shipping/route.ts
 *
 * API Route: POST /api/printful/shipping - Estimate real-time Printful shipping rates.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { PrintfulShippingRateInputSchema } from "@/lib/printful/validation";
import { PrintfulError } from "@/lib/printful/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PrintfulShippingRateInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Shipping calculation validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const rates = await printfulService.estimateShipping(parsed.data);

    return NextResponse.json({ success: true, rates, count: rates.length });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to calculate shipping rates";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
