/**
 * app/api/printful/store/route.ts
 *
 * API Route: GET /api/printful/store - Fetch store info, credential health, and warehouse status.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { validatePrintfulCredentials } from "@/lib/printful/config";

export async function GET() {
  try {
    const creds = validatePrintfulCredentials();
    const store = await printfulService.getStoreInfo().catch(() => null);
    const warehouse = await printfulService.getWarehouseStatus().catch(() => ({ products: [], locations: [] }));

    return NextResponse.json({
      success: true,
      credentials: creds,
      store,
      warehouse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch store details";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
