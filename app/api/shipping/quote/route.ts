/**
 * POST /api/shipping/quote
 *
 * Computes dynamic real-time shipping options and freight estimates for checkout items
 * using the official CJ Dropshipping Open API (/logistic/freightCalculate).
 */

import { type NextRequest } from "next/server";
import { cjDropshipping } from "@/lib/cj-dropshipping";
import { createAdminSupabaseClient } from "@/lib/supabase";

const COUNTRY_CODE_MAP: Record<string, string> = {
  "united states": "US",
  us: "US",
  usa: "US",
  canada: "CA",
  ca: "CA",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  australia: "AU",
  au: "AU",
  germany: "DE",
  de: "DE",
  france: "FR",
  fr: "FR",
  india: "IN",
  in: "IN",
};

export function getIsoCountryCode(countryName?: string | null): string {
  if (!countryName) return "US";
  const cleaned = countryName.trim().toLowerCase();
  return COUNTRY_CODE_MAP[cleaned] || (cleaned.length === 2 ? cleaned.toUpperCase() : "US");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country, items } = body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { success: false, error: "Cart items are required for shipping calculation." },
        { status: 400 }
      );
    }

    const endCountryCode = getIsoCountryCode(country);
    const firstItem = items[0];
    let vid = firstItem.variant_id || "";
    if (vid.startsWith("cj-")) {
      vid = vid.replace("cj-", "");
    }

    // If variant_id is missing, try looking up product record in Supabase to get cj_product_id or vid
    if (!vid && firstItem.product_id) {
      try {
        const supabase = createAdminSupabaseClient();
        const { data: prodData } = await supabase
          .from("products")
          .select("cj_product_id")
          .eq("id", firstItem.product_id)
          .maybeSingle();

        if (prodData?.cj_product_id) {
          vid = prodData.cj_product_id;
        }
      } catch {
        // fallback
      }
    }

    // If live CJ API credentials are configured, query real freight options
    if (cjDropshipping.isConfigured() && vid) {
      const cjOptions = await cjDropshipping.getShippingInfo({
        endCountryCode,
        vid,
        quantity: firstItem.quantity || 1,
      });

      if (Array.isArray(cjOptions) && cjOptions.length > 0) {
        const mappedOptions = cjOptions.map((opt) => ({
          id: opt.logisticName || "CJ Shipping",
          name: opt.logisticName || "CJ Tracked Shipping",
          price: typeof opt.logisticPrice === "number" ? opt.logisticPrice : 0,
          eta: opt.logisticAging ? `${opt.logisticAging} business days` : "Tracked delivery",
        }));

        return Response.json({
          success: true,
          supported: true,
          options: mappedOptions,
        });
      }

      // If CJ returns 0 options for this country, the destination is unsupported by supplier
      return Response.json({
        success: false,
        supported: false,
        error: `Shipping is currently unavailable for ${country || "selected destination"}.`,
        options: [],
      });
    }

    // Default verified response for dev/mock mode when live API key is unconfigured
    return Response.json({
      success: true,
      supported: true,
      options: [
        {
          id: "standard",
          name: "Standard Tracked Shipping",
          price: 0,
          eta: "Calculated at fulfillment",
        },
      ],
    });
  } catch (error) {
    console.error("[api/shipping/quote] Failed to calculate shipping:", error);
    return Response.json(
      {
        success: false,
        supported: false,
        error: "Unable to calculate shipping rates at this time.",
      },
      { status: 500 }
    );
  }
}
