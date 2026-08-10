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
import { importCJProduct, parseVariantDetails } from "./lib/cj-import";

async function testSocksPIDImport() {
  const pid = "2607220943541632700";
  console.log(`=== TESTING EXACT FAILING SOCKS PID: ${pid} ===`);

  const detail = await cjDropshipping.getProductDetail(pid);
  if (!detail) {
    console.error("CJ returned null detail!");
    return;
  }

  console.log("Product Name:", detail.productNameEn || detail.productName);
  console.log("Raw CJ variants count:", detail.variants?.length ?? 0);
  console.log("productKeyEnSet:", (detail as any).productKeyEnSet);
  console.log("productKeyEn:", (detail as any).productKeyEn);

  if (detail.variants && detail.variants.length > 0) {
    console.log("\nRaw Variants:");
    detail.variants.forEach((v, i) => {
      console.log(`\nVariant [${i}]:`);
      console.log(`  vid: ${v.vid}`);
      console.log(`  variantNameEn: ${v.variantNameEn}`);
      console.log(`  variantKey: ${v.variantKey}`);
      console.log(`  variantSku: ${v.variantSku}`);
      console.log(`  variantImage: ${v.variantImage}`);
      const parsed = parseVariantDetails(v, (detail as any).productKeyEnSet, (detail as any).productKeyEn);
      console.log(`  Parsed -> color: "${parsed.color}", size: "${parsed.size}", attrs:`, parsed.attributes);
    });
  }

  // Run importCJProduct with action: 'update'
  console.log("\n--- Running importCJProduct({ pid, action: 'update' }) ---");
  const report = await importCJProduct({ pid, action: "update" });
  console.log("Import status:", report.status);
  console.log("Variants imported:", report.variantsImported);
  if (report.product) {
    console.log("Report product variants count:", (report.product as any).variants?.length ?? 0);
  }
}

testSocksPIDImport().catch(console.error);
