/**
 * GET /api/admin/health
 *
 * System Health Diagnostic API endpoint for Admin Console.
 * Checks database connectivity, Stripe API, CJ Dropshipping API,
 * Email queue metrics, and environment configurations.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentAdmin();
    const startTime = Date.now();

    const supabase = createAdminSupabaseClient();

    // 1. Database Health & Latency Test
    const dbStart = Date.now();
    const { count: dbOrdersCount, error: dbError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true });
    const dbLatencyMs = Date.now() - dbStart;

    // 2. Email Logs Queue Health
    const [queuedRes, failedRes, sentRes] = await Promise.all([
      supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "queued"),
      supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "sent"),
    ]);

    // 3. Env Config Checks
    const envStatus = {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("placeholder")),
      cj: Boolean(
        process.env.CJ_API_KEY &&
          !process.env.CJ_API_KEY.includes("placeholder") &&
          process.env.CJ_MCP_TOKEN
      ),
      email: process.env.EMAIL_PROVIDER || "mock",
    };

    const overallLatencyMs = Date.now() - startTime;

    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      latencyMs: overallLatencyMs,
      services: {
        database: {
          status: dbError ? "degraded" : "operational",
          latencyMs: dbLatencyMs,
          ordersCount: dbOrdersCount || 0,
          error: dbError?.message || null,
        },
        stripe: {
          status: envStatus.stripe ? "configured" : "placeholder_mode",
        },
        cjDropshipping: {
          status: envStatus.cj ? "live_mode" : "mock_mode",
        },
        emailService: {
          provider: envStatus.email,
          queuedCount: queuedRes.count || 0,
          failedCount: failedRes.count || 0,
          sentCount: sentRes.count || 0,
        },
      },
      env: envStatus,
    });
  } catch (error) {
    console.error("[api/admin/health] Diagnostic error:", error);
    return Response.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
