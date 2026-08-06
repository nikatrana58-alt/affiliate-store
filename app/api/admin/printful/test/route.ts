import { NextResponse } from "next/server";
import { printfulClient } from "@/lib/printful";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await printfulClient.testConnection();
    return NextResponse.json({
      success: result.success,
      message: result.message,
      storeName: result.storeName,
      latencyMs: result.latencyMs,
      tokenConfigured: result.tokenConfigured,
      storeIdConfigured: result.storeIdConfigured,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg, message: `Printful test failed: ${msg}` },
      { status: 500 }
    );
  }
}
