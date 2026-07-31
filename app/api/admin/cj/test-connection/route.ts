/**
 * GET /api/admin/cj/test-connection
 *
 * Admin-only diagnostic endpoint that verifies the CJ Open API connection
 * by attempting to acquire a fresh access token with the configured CJ_API_KEY.
 *
 * Returns a structured JSON result indicating whether authentication succeeded,
 * round-trip latency, and whether both CJ credentials are present.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { cjDropshipping } from "@/lib/cj-dropshipping";

export async function GET(_request: NextRequest) {
  try {
    await requireCurrentAdmin();

    const result = await cjDropshipping.testConnection();

    return Response.json(
      {
        timestamp: new Date().toISOString(),
        ...result,
      },
      { status: result.success ? 200 : 502 }
    );
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthorized") || error.message.includes("Admin"));

    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
