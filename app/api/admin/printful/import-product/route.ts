import { NextRequest, NextResponse } from "next/server";
import { importPrintfulProduct } from "@/lib/printful-import";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const syncProductId = body.sync_product_id || body.id || body.pid;
    const action = body.action || "import";

    if (!syncProductId) {
      return NextResponse.json(
        { success: false, error: "Missing sync_product_id parameter." },
        { status: 400 }
      );
    }

    const report = await importPrintfulProduct({
      sync_product_id: syncProductId,
      action,
      markup_percent: body.markup_percent ? Number(body.markup_percent) : 40,
    });

    return NextResponse.json(report);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", message: msg, error: msg },
      { status: 500 }
    );
  }
}
