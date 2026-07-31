/**
 * GET /api/cj/health
 *
 * Simple health check endpoint for CJ Open API integration.
 *
 * Expected Response:
 * {
 *   "connected": true,
 *   "api": "ok"
 * }
 */

import { type NextRequest } from "next/server";
import { cjDropshipping } from "@/lib/cj-dropshipping";

export async function GET(_request: NextRequest) {
  try {
    const conn = await cjDropshipping.testConnection();

    if (conn.success) {
      return Response.json({
        connected: true,
        api: "ok",
      });
    }

    return Response.json(
      {
        connected: false,
        api: "error",
        message: conn.message,
      },
      { status: 502 }
    );
  } catch (error) {
    return Response.json(
      {
        connected: false,
        api: "error",
        message: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
