/**
 * POST /api/admin/cj/import-product
 *
 * Admin-only endpoint that imports, updates, or duplicates a product from CJ Open API
 * into Supabase products, product_variants, and inventory tables.
 *
 * Request body (JSON):
 *   {
 *     "pid": "2607291251011619500",
 *     "action": "import" | "update" | "duplicate"
 *   }
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { importCJProduct } from "@/lib/cj-import";

export async function POST(request: NextRequest) {
  try {
    await requireCurrentAdmin();

    let pid: string | undefined;
    let action: "import" | "update" | "duplicate" | undefined;

    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as { pid?: string; action?: "import" | "update" | "duplicate" };
        pid = body.pid?.trim() || undefined;
        action = body.action;
      }
    } catch {
      // Body empty or invalid JSON — proceed with defaults
    }

    console.info(`[api/admin/cj/import-product] Import triggered. PID: ${pid ?? "(auto)"}, action: ${action ?? "import"}`);

    const report = await importCJProduct({ pid, action });

    const httpStatus = report.status === "imported" ? 201
      : report.status === "already_imported" ? 200
      : 500;

    return Response.json(report, { status: httpStatus });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[api/admin/cj/import-product] Unhandled error:", error);
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Import failed unexpectedly.",
        logs: [],
        durationMs: 0,
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
