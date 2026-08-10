import fs from "fs";
import path from "path";

// Load .env.local
try {
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {}

import { cjDropshipping } from "./lib/cj-dropshipping";
import { importCJProduct } from "./lib/cj-import";
import { getProductBySlug } from "./lib/products";
import { createAdminSupabaseClient } from "./lib/supabase";

async function runFullPipelineVerification() {
  console.log("==========================================================================");
  console.log("E2E PIPELINE VERIFICATION FOR FRESH CJ PRODUCTS");
  console.log("==========================================================================");

  // 1. Fetch CJ Catalogue to find 2 completely fresh products
  console.log("\n[1/5] Fetching page 2 of CJ product list for brand-new PIDs...");
  const listRes = await cjDropshipping.getProductList({ pageNum: 2, pageSize: 15 });
  
  if (!listRes.list || listRes.list.length === 0) {
    console.error("Failed to fetch products from CJ catalog.");
    return;
  }

  // Filter for products with > 1 variants
  const freshProducts: Array<{ pid: string; title: string }> = [];
  for (const item of listRes.list) {
    const detail = await cjDropshipping.getProductDetail(item.pid);
    if (detail && detail.variants && detail.variants.length > 1) {
      freshProducts.push({ pid: item.pid, title: item.productNameEn || item.productName || "CJ Item" });
      if (freshProducts.length >= 2) break;
    }
  }

  console.log(`Found ${freshProducts.length} fresh CJ products for verification:`);
  freshProducts.forEach((p, idx) => console.log(`  Product ${idx + 1}: PID ${p.pid} - "${p.title}"`));

  const results: any[] = [];

  for (let i = 0; i < freshProducts.length; i++) {
    const target = freshProducts[i];
    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`VERIFYING PRODUCT ${i + 1}/${freshProducts.length}: PID ${target.pid}`);
    console.log(`--------------------------------------------------------------------------`);

    // A. Fetch CJ raw detail
    const rawDetail = await cjDropshipping.getProductDetail(target.pid);
    if (!rawDetail || !rawDetail.variants) {
      console.error(`Could not fetch detail for PID ${target.pid}`);
      continue;
    }

    const cjVariantCount = rawDetail.variants.length;
    const productKeyEnSet = (rawDetail as any).productKeyEnSet || [];
    console.log(`1. CJ API returned      : ${cjVariantCount} variants, productKeyEnSet:`, productKeyEnSet);

    // B. Run Importer
    const report = await importCJProduct({ pid: target.pid, action: "update" });
    console.log(`2. Importer Status      : ${report.status}`);
    console.log(`3. Importer Variants    : ${report.variantsImported}`);

    if (report.status === "error" || !report.product) {
      console.error(`Import failed: ${report.message}`);
      continue;
    }

    const slug = report.product.slug;
    const productId = report.product.id;

    // C. Inspect Supabase row
    const supabase = createAdminSupabaseClient();
    const { data: dbRow } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
    console.log(`4. Supabase 'products'   : Row exists=${Boolean(dbRow)}, cj_product_id=${dbRow?.cj_product_id}`);

    // D. Retrieve via getProductBySlug
    const retrievedProduct = await getProductBySlug(slug);
    const retrievedVariants = retrievedProduct?.variants || [];
    const retrievedImages = retrievedProduct?.images || [];
    console.log(`5. getProductBySlug()   : Variants=${retrievedVariants.length}, Images=${retrievedImages.length}`);

    // E. Verify Variant Selection & VID Propagation
    let validCombinationFound = false;
    let selectedVid = "";
    let selectedName = "";

    if (retrievedVariants.length > 0) {
      const sampleVariant = retrievedVariants[0];
      selectedVid = sampleVariant.cj_variant_id || sampleVariant.id || "";
      selectedName = sampleVariant.name;

      // Verify exact VID matches raw CJ variant VID
      const rawMatch = rawDetail.variants.find((v) => v.vid === selectedVid);
      if (rawMatch) {
        validCombinationFound = true;
      }
    }

    console.log(`6. Selected Variant VID : "${selectedVid}" (${selectedName})`);
    console.log(`7. Exact VID Matched CJ : ${validCombinationFound}`);

    const isPass =
      report.status === "imported" &&
      cjVariantCount === report.variantsImported &&
      cjVariantCount === retrievedVariants.length &&
      validCombinationFound &&
      Boolean(selectedVid);

    results.push({
      pid: target.pid,
      title: target.title,
      cjVariants: cjVariantCount,
      importedVariants: report.variantsImported,
      retrievedVariants: retrievedVariants.length,
      retrievedImages: retrievedImages.length,
      selectedVid,
      pass: isPass,
    });
  }

  console.log("\n==========================================================================");
  console.log("PIPELINE VERIFICATION SUMMARY TABLE");
  console.log("==========================================================================");
  console.table(results);

  const allPassed = results.length > 0 && results.every((r) => r.pass);
  console.log(`\nALL FRESH PRODUCTS PASSED: ${allPassed ? "YES [PASS]" : "NO [FAIL]"}`);
}

runFullPipelineVerification().catch(console.error);
