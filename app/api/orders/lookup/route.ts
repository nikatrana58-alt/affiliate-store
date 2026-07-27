/**
 * GET /api/orders/lookup
 *
 * Public endpoint allowing customers to look up their orders using
 * their email address and optional order ID.
 */

import { type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { ORDER_COLUMNS, ORDER_ITEM_COLUMNS } from "@/lib/db/types";
import type { OrderWithItems } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const orderId = searchParams.get("orderId")?.trim();

    if (!email) {
      return Response.json(
        { error: "Email address is required to look up orders." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("orders")
      .select(`${ORDER_COLUMNS}, order_items (${ORDER_ITEM_COLUMNS})`)
      .eq("customer_email", email)
      .order("created_at", { ascending: false });

    if (orderId) {
      query = query.eq("id", orderId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({
      orders: (data ?? []) as unknown as OrderWithItems[],
    });
  } catch (error) {
    console.error("[api/orders/lookup] Lookup failed:", error);
    return Response.json(
      { error: "Unable to retrieve orders. Please verify your email address." },
      { status: 500 }
    );
  }
}
