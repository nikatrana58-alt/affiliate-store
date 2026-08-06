/**
 * app/api/cron/sync/route.ts
 *
 * API Route: GET / POST /api/cron/sync - Scheduled Cron Synchronization Endpoint.
 * Compatible with Vercel Cron, GitHub Actions, and external cron services.
 */

import { NextResponse } from "next/server";
import { executeScheduledSync } from "@/lib/sync/cron";

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") as "incremental" | "full") || "incremental";

    const result = await executeScheduledSync(authHeader, { mode });

    if (!result.success && result.message.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: result.message }, { status: 401 });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
