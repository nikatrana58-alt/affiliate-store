/**
 * GET /api/admin/cj/shipping
 *
 * Dedicated asynchronous endpoint to fetch shipping options and freight estimates for a product variant.
 * Called progressively by CJ Importer modal without blocking initial product details rendering.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { cjDropshipping } from "@/lib/cj-dropshipping";

export async function GET(request: NextRequest) {
  const tStart = performance.now();
  try {
    await requireCurrentAdmin();

    const { searchParams } = new URL(request.url);
    const vid = searchParams.get("vid")?.trim();
    const endCountryCode = searchParams.get("endCountryCode")?.trim() || "US";

    if (!vid) {
      return Response.json({ error: "Variant ID (vid) is required." }, { status: 400 });
    }

    const shippingOptions = await cjDropshipping.getShippingInfo({
      vid,
      endCountryCode,
    });

    const executionMs = performance.now() - tStart;
    console.info(`[api/admin/cj/shipping] Fetched ${shippingOptions.length} shipping options for VID ${vid} in ${executionMs.toFixed(2)}ms`);

    return Response.json({
      shippingOptions,
      _timings: {
        shippingApiMs: Number(executionMs.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("[api/admin/cj/shipping] Failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch shipping options." },
      { status: 500 }
    );
  }
}
