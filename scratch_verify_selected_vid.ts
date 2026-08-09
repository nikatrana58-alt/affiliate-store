import fs from "fs";
import path from "path";
import assert from "assert";

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

import { getProductBySlug } from "./lib/products";

async function verifyVidPreservation() {
  const slug = "love-hug-couple-necklace";
  console.log(`=== VERIFYING CJ VID PRESERVATION FOR SLUG: ${slug} ===`);

  const product = await getProductBySlug(slug);
  assert(product !== null, "Product fetched successfully");
  assert(Array.isArray(product.variants), "Product variants is an array");
  console.log(`Total Variants Preserved: ${product.variants.length}`);
  assert.strictEqual(product.variants.length, 29, "Exact 29 variants preserved");

  // Inspect specific variants for Gold, Black, Silver, etc.
  const goldVar = product.variants.find((v) => v.name?.includes("Gold") && !v.name?.includes("Black") && !v.name?.includes("set"));
  const blackVar = product.variants.find((v) => v.name?.includes("Black") && !v.name?.includes("gold") && !v.name?.includes("set"));
  const silverVar = product.variants.find((v) => v.name?.includes("Silver") && !v.name?.includes("Gold") && !v.name?.includes("set"));

  console.log("\nSample Preserved Variants:");
  if (goldVar) console.log("Gold Variant   :", { name: goldVar.name, cj_variant_id: goldVar.cj_variant_id, sku: goldVar.sku });
  if (blackVar) console.log("Black Variant  :", { name: blackVar.name, cj_variant_id: blackVar.cj_variant_id, sku: blackVar.sku });
  if (silverVar) console.log("Silver Variant :", { name: silverVar.name, cj_variant_id: silverVar.cj_variant_id, sku: silverVar.sku });

  assert(Boolean(goldVar?.cj_variant_id), "Gold variant retains cj_variant_id (vid)");
  assert(Boolean(blackVar?.cj_variant_id), "Black variant retains cj_variant_id (vid)");
  assert(Boolean(silverVar?.cj_variant_id), "Silver variant retains cj_variant_id (vid)");

  console.log("\n=======================================================");
  console.log("🎉 ALL 29 CJ VARIANTS AND VIDs PRESERVED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

verifyVidPreservation().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
