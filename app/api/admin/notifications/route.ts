/**
 * GET /api/admin/notifications - List admin system notifications & unread counter
 * PATCH /api/admin/notifications - Mark admin notifications read / mark all read
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;

    const supabase = createAdminSupabaseClient();

    const [listRes, countRes, unreadRes] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }),
      supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);

    if (listRes.error) throw listRes.error;

    return Response.json({
      notifications: listRes.data || [],
      count: countRes.count || 0,
      unreadCount: unreadRes.count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[api/admin/notifications] GET failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireCurrentAdmin();
    const body = (await request.json()) as {
      id?: string;
      markAllRead?: boolean;
    };

    const supabase = createAdminSupabaseClient();

    if (body.markAllRead) {
      await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
    } else if (body.id) {
      await supabase.from("admin_notifications").update({ is_read: true }).eq("id", body.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[api/admin/notifications] PATCH failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update notifications." },
      { status: 500 }
    );
  }
}
