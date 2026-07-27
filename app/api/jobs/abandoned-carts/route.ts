/**
 * POST /api/jobs/abandoned-carts
 *
 * Background cron endpoint to send automated abandoned cart reminder emails.
 */

import { type NextRequest } from "next/server";
import { processAbandonedCartReminders } from "@/lib/growth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (secret && authHeader && authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized cron request." }, { status: 401 });
    }

    const result = await processAbandonedCartReminders();
    return Response.json({
      success: true,
      countSent: result.countSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron-abandoned-carts] Execution error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Abandoned cart processing failed." },
      { status: 500 }
    );
  }
}
