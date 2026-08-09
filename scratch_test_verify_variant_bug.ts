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

import { getProductBySlug, getProducts } from "./lib/products";
import { importCJProduct } from "./lib/cj-import";
import { createAdminSupabaseClient } from "./lib/supabase";

async function testVariantImportBug() {
  const testPid = "83E99ECE-9B27-44A7-925A-D32E980BB6AB";
  console.log(`=== TESTING CJ VARIANT IMPORT FOR PID: ${testPid} ===`);

  const supabase = createAdminSupabaseClient();

  // 1. Run Import (or update action)
  console.log("\n--- Running importCJProduct({ pid: testPid, action: 'update' }) ---");
  const report = await importCJProduct({ pid: testPid, action: "update" });
  console.log("Import Status    :", report.status);
  console.log("Message          :", report.message);
  console.log("VariantsImported :", report.variantsImported);
  console.log("Logs count       :", report.logs?.length);
  if (report.logs) {
    console.log("First 10 Logs:\n" + report.logs.slice(0, 10).join("\n"));
    const errLogs = report.logs.filter((l) => l.includes("notice") || l.includes("failed") || l.includes("ERROR"));
    if (errLogs.length > 0) {
      console.log("\nError/Notice Logs:\n" + errLogs.join("\n"));
    }
  }

  // 2. Query Supabase product_variants table directly
  if (report.product) {
    console.log("\n--- Querying Supabase product_variants table directly ---");
    const { data: dbVariants, error: vErr } = await supabase
      .from("product_variants")
      .select("id, name, sku, price_delta, cj_variant_id, attributes")
      .eq("product_id", report.product.id);

    console.log("Direct DB variants error :", vErr?.message || "none");
    console.log("Direct DB variants count :", dbVariants?.length ?? 0);
    if (dbVariants && dbVariants.length > 0) {
      console.log("Sample DB Variant [0]    :", dbVariants[0]);
    }

    // 3. Query getProductBySlug
    console.log("\n--- Querying getProductBySlug(report.product.slug) ---");
    const fetchedProduct = await getProductBySlug(report.product.slug);
    console.log("Fetched product title    :", fetchedProduct?.title);
    console.log("Fetched product variants :", fetchedProduct?.variants?.length ?? 0);
  }
}

testVariantImportBug().catch(console.error);
