/**
 * app/api/printful/mockups/route.ts
 *
 * API Route: POST /api/printful/mockups - Initiate mockup generation task.
 * API Route: GET /api/printful/mockups?task_key=... - Retrieve mockup task results.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { printfulClient } from "@/lib/printful/client";
import { PrintfulMockupTaskInputSchema } from "@/lib/printful/validation";
import { PrintfulError } from "@/lib/printful/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PrintfulMockupTaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Mockup input validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const mockupResult = await printfulService.getMockups(
      parsed.data.product_id,
      parsed.data.files,
      parsed.data.variant_ids,
      parsed.data.format
    );

    return NextResponse.json({ success: true, mockupResult });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to generate mockups";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskKey = searchParams.get("task_key");

    if (!taskKey) {
      return NextResponse.json({ success: false, error: "task_key parameter is required" }, { status: 400 });
    }

    const taskResult = await printfulClient.getMockupTask(taskKey);
    return NextResponse.json({ success: true, taskResult });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to retrieve mockup task status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
