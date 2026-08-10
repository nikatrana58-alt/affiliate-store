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

async function diagnoseFreshCJProduct() {
  console.log("=================================================");
  console.log("STEP 1: FETCH FRESH CJ PRODUCT FROM CATALOGUE");
  console.log("=================================================");

  // Fetch product list to find a fresh product
  const listRes = await cjDropshipping.getProductList(1, 10);
  if (!listRes.list || listRes.list.length === 0) {
    console.error("No products returned from CJ list");
    return;
  }

  // Find a product that has variants
  let freshPid = "";
  let rawDetail: any = null;

  for (const item of listRes.list) {
    console.log(`Checking PID: ${item.pid} - ${item.productNameEn || item.productName}`);
    const detail = await cjDropshipping.getProductDetail(item.pid);
    if (detail && detail.variants && detail.variants.length > 1) {
      freshPid = item.pid;
      rawDetail = detail;
      break;
    }
  }

  if (!freshPid || !rawDetail) {
    console.error("Could not find a CJ product with > 1 variants in first page");
    return;
  }

  console.log(`\nSelected Fresh CJ PID: ${freshPid}`);
  console.log(`Title: ${rawDetail.productNameEn || rawDetail.productName}`);
  console.log(`Raw CJ variants count: ${rawDetail.variants.length}`);
  console.log(`Raw CJ productKeyEnSet:`, rawDetail.productKeyEnSet);
  console.log(`Raw CJ productKeyEn:`, rawDetail.productKeyEn);
  console.log(`Sample Raw CJ Variant [0]:`, JSON.stringify(rawDetail.variants[0], null, 2));

  console.log("\n=================================================");
  console.log("STEP 2: RUN importCJProduct");
  console.log("=================================================");
  const report = await importCJProduct({ pid: freshPid, action: "update" });

  console.log(`Import Status: ${report.status}`);
  console.log(`Message: ${report.message}`);
  console.log(`Variants Imported by Importer: ${report.variantsImported}`);

  if (!report.product) {
    console.error("No product returned in import report!");
    return;
  }

  const slug = report.product.slug;
  const productId = report.product.id;

  console.log("\n=================================================");
  console.log("STEP 3: INSPECT SUPABASE PERSISTENCE");
  console.log("=================================================");
  const supabase = createAdminSupabaseClient();
  
  const { data: dbProduct, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  console.log("Supabase 'products' row found:", Boolean(dbProduct));
  if (pErr) console.error("Error fetching product row:", pErr.message);
  if (dbProduct) {
    console.log("Supabase product keys:", Object.keys(dbProduct));
    console.log("Supabase cj_product_id:", dbProduct.cj_product_id);
    console.log("Supabase product variants column:", (dbProduct as any).variants);
  }

  const { data: dbVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", dbProduct?.id || productId);

  console.log(`Supabase 'product_variants' rows count: ${dbVariants?.length ?? 0}`);
  if (vErr) console.error("Error fetching product_variants rows:", vErr.message);
  if (dbVariants && dbVariants.length > 0) {
    console.log("Sample Supabase Variant [0]:", JSON.stringify(dbVariants[0], null, 2));
  }

  console.log("\n=================================================");
  console.log("STEP 4: INSPECT getProductBySlug RETRIEVAL");
  console.log("=================================================");
  const fetchedProduct = await getProductBySlug(slug);

  if (!fetchedProduct) {
    console.error(`getProductBySlug("${slug}") returned null!`);
    return;
  }

  console.log(`Retrieved Product Title: ${fetchedProduct.title}`);
  console.log(`Retrieved Product Slug: ${fetchedProduct.slug}`);
  console.log(`Retrieved Product cj_product_id: ${fetchedProduct.cj_product_id}`);
  console.log(`Retrieved Product Variants count: ${fetchedProduct.variants?.length ?? 0}`);
  console.log(`Retrieved Product Images count: ${fetchedProduct.images?.length ?? 0}`);
  if (fetchedProduct.variants && fetchedProduct.variants.length > 0) {
    console.log("Sample Retrieved Variant [0]:", JSON.stringify(fetchedProduct.variants[0], null, 2));
  }

  console.log("\n=================================================");
  console.log("STEP 5: SIMULATE STOREFRONT VARIANT SELECTOR MAPPING");
  console.log("=================================================");
  const variants = fetchedProduct.variants || [];
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  const styleSet = new Set<string>();

  for (const v of variants) {
    if (v.color?.trim()) colorSet.add(v.color.trim());
    if (v.size?.trim()) sizeSet.add(v.size.trim());
    if (v.attributes) {
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (!val || typeof val !== "string" || k.startsWith("Weight")) return;
        const lowerK = k.toLowerCase();
        const hasExplicitColor = Boolean(v.color?.trim());
        const hasExplicitSize = Boolean(v.size?.trim());
        if (!hasExplicitColor && (lowerK.includes("color") || lowerK.includes("style") || lowerK.includes("pattern"))) {
          colorSet.add(val.trim());
        } else if (!hasExplicitSize && (lowerK.includes("size") || lowerK.includes("option") || lowerK.includes("specification") || lowerK.includes("model"))) {
          sizeSet.add(val.trim());
        } else if (!hasExplicitColor && !hasExplicitSize) {
          styleSet.add(val.trim());
        }
      });
    }
  }

  console.log(`Extracted Colors (${colorSet.size}):`, Array.from(colorSet));
  console.log(`Extracted Sizes (${sizeSet.size}):`, Array.from(sizeSet));
  console.log(`Extracted Styles (${styleSet.size}):`, Array.from(styleSet));

  // Test selecting default color & size
  const defaultVariant = variants[0] || null;
  const defaultColor = defaultVariant?.color || defaultVariant?.attributes?.["Color"] || defaultVariant?.attributes?.["Style"] || Array.from(colorSet)[0] || null;
  const defaultSize = defaultVariant?.size || defaultVariant?.attributes?.["Size"] || defaultVariant?.attributes?.["Option"] || Array.from(sizeSet)[0] || null;

  console.log(`Default selectedColor: "${defaultColor}"`);
  console.log(`Default selectedSize: "${defaultSize}"`);

  const matched = variants.find(
    (v) =>
      (!colorSet.size || v.color === defaultColor || v.attributes?.["Color"] === defaultColor || v.attributes?.["Style"] === defaultColor) &&
      (!sizeSet.size || v.size === defaultSize || v.attributes?.["Size"] === defaultSize || v.attributes?.["Option"] === defaultSize)
  );

  console.log(`Matched Variant for default selection:`, matched ? `${matched.name} (VID: ${matched.cj_variant_id})` : "NONE (Combination Unavailable!)");
}

diagnoseFreshCJProduct().catch(console.error);
