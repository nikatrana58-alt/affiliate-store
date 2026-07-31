/**
 * GET /api/admin/cj/search
 *
 * Admin endpoint to search/browse CJ Dropshipping products using official CJ Open API.
 * Automatically classifies search inputs into PRODUCT_ID, SKU, or KEYWORD.
 * Measures and logs execution performance to ensure search responds under 3 seconds.
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { cjDropshipping, detectCJSearchType, type CJProductDetail } from "@/lib/cj-dropshipping";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const tStart = performance.now();
  try {
    await requireCurrentAdmin();

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || undefined;
    const category = searchParams.get("category")?.trim() || undefined;
    const pid = searchParams.get("pid")?.trim() || undefined;
    const sku = searchParams.get("sku")?.trim() || searchParams.get("productSku")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    let list: CJProductDetail[] = [];
    let total = 0;
    let detectedType: string = "KEYWORD";

    const rawSearch = pid || sku || keyword;
    const classification = detectCJSearchType(rawSearch);
    detectedType = classification.type;

    console.info(`[api/admin/cj/search] Input="${rawSearch || ""}" -> Classified Search Type="${detectedType}" (Clean: "${classification.cleanInput}")`);

    if (rawSearch && classification.cleanInput) {
      if (detectedType === "PRODUCT_ID") {
        try {
          const detail = await cjDropshipping.getProductDetail(classification.cleanInput);
          if (detail) {
            list = [detail];
            total = 1;
          }
        } catch (err) {
          console.warn(`[api/admin/cj/search] Direct detail query for PID ${classification.cleanInput} failed, falling back to list query`, err);
        }

        if (!list.length) {
          const res = await cjDropshipping.getProductList({
            pageNum: page,
            pageSize,
            pid: classification.cleanInput,
            categoryId: category,
          });
          list = res.list || [];
          total = res.total || list.length;
        }
      } else if (detectedType === "SKU") {
        const res = await cjDropshipping.getProductList({
          pageNum: page,
          pageSize,
          productSku: classification.cleanInput,
          categoryId: category,
        });
        list = res.list || [];
        total = res.total || list.length;
      } else {
        // KEYWORD
        const res = await cjDropshipping.getProductList({
          pageNum: page,
          pageSize,
          keyWord: classification.cleanInput,
          categoryId: category,
        });
        list = res.list || [];
        total = res.total || list.length;
      }
    } else {
      // Default catalog browsing (no query)
      const res = await cjDropshipping.getProductList({
        pageNum: page,
        pageSize,
        categoryId: category,
      });
      list = res.list || [];
      total = res.total || list.length;
    }

    // Cross-reference with Supabase to flag already-imported products
    const pids = list.map((p) => p.pid).filter(Boolean);
    let importedMap: Record<string, { id: string; slug: string }> = {};

    if (pids.length > 0) {
      try {
        const supabase = createAdminSupabaseClient();
        const { data } = await supabase
          .from("products")
          .select("id, slug, cj_product_id")
          .in("cj_product_id", pids);

        if (data) {
          for (const item of data) {
            if (item.cj_product_id) {
              importedMap[item.cj_product_id] = { id: item.id, slug: item.slug };
            }
          }
        }
      } catch (dbErr) {
        console.warn("[api/admin/cj/search] Failed to check imported status against Supabase", dbErr);
      }
    }

    const enrichedList = list.map((item) => {
      const imported = importedMap[item.pid];
      return {
        ...item,
        alreadyImported: Boolean(imported),
        importedProduct: imported ?? null,
      };
    });

    const totalExecutionMs = performance.now() - tStart;
    console.info(`[PROFILER /api/admin/cj/search] Search Type="${detectedType}" | Results=${enrichedList.length} | Execution time: ${totalExecutionMs.toFixed(2)} ms`);

    return Response.json({
      products: enrichedList,
      total,
      page,
      pageSize,
      searchTypeDetected: detectedType,
      _timings: {
        totalExecutionMs: Number(totalExecutionMs.toFixed(2)),
      },
    });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[api/admin/cj/search] Failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to search CJ products." },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
