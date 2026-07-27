/**
 * GET /api/admin/email-logs - View email delivery status logs with pagination
 * POST /api/admin/email-logs - Retry failed emails
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { retryFailedEmailLogs } from "@/lib/email/service";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;

    const supabase = createAdminSupabaseClient();

    const [logsRes, countRes] = await Promise.all([
      supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase.from("email_logs").select("id", { count: "exact", head: true }),
    ]);

    if (logsRes.error) throw logsRes.error;

    return Response.json({
      logs: logsRes.data || [],
      count: countRes.count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[api/admin/email-logs] GET failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load email logs." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await requireCurrentAdmin();
    const result = await retryFailedEmailLogs();

    return Response.json({
      success: true,
      retriedCount: result.retriedCount,
      successCount: result.successCount,
    });
  } catch (error) {
    console.error("[api/admin/email-logs] POST retry failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to retry email logs." },
      { status: 500 }
    );
  }
}
