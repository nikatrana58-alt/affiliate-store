import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { getAllOrders, getOrderStats } from "@/lib/orders";
import type { OrderStatus } from "@/lib/orders";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
    const status = (searchParams.get("status") ?? "all") as OrderStatus | "all";
    const search = searchParams.get("search") ?? undefined;
    const dateFilter = (searchParams.get("dateFilter") ?? "all") as "all" | "today" | "week" | "month";
    const sortOrder = (searchParams.get("sortOrder") ?? "newest") as "newest" | "oldest";

    const [{ orders, count }, stats] = await Promise.all([
      getAllOrders({ limit, offset, status, search, dateFilter, sortOrder }),
      getOrderStats(),
    ]);

    return Response.json({ orders, count, limit, offset, stats });
  } catch (error) {
    console.error("[api/admin/orders] GET failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load orders." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

