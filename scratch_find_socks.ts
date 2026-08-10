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
import { parseVariantDetails } from "./lib/cj-import";

async function findSocksProduct() {
  console.log("Searching CJ for 'All-cotton Mid-calf Contrast-color Mens Seamless Socks'...");
  const searchRes = await cjDropshipping.getProductList({ keyWord: "All-cotton Mid-calf Contrast-color Mens Seamless Socks", pageSize: 5 });
  
  let list = searchRes.list || [];
  if (list.length === 0) {
    console.log("Not found by exact name, searching 'Seamless Socks'...");
    const altRes = await cjDropshipping.getProductList({ keyWord: "Seamless Socks", pageSize: 5 });
    list = altRes.list || [];
    console.log("Alt search count:", list.length);
  }

  for (const item of list) {
    console.log(`\nFound Product PID: ${item.pid}`);
    console.log(`Title: ${item.productNameEn || item.productName}`);
    console.log(`SKU: ${item.productSku}`);

    const detail = await cjDropshipping.getProductDetail(item.pid);
    if (detail) {
      console.log(`Variants count: ${detail.variants?.length}`);
      console.log(`productKeyEnSet:`, (detail as any).productKeyEnSet);
      console.log(`productKeyEn:`, (detail as any).productKeyEn);
      
      if (detail.variants && detail.variants.length > 0) {
        console.log("\nSample variants parsed:");
        detail.variants.slice(0, 5).forEach((v, idx) => {
          const parsed = parseVariantDetails(v, (detail as any).productKeyEnSet, (detail as any).productKeyEn);
          console.log(`Variant [${idx}] key="${v.variantKey}" nameEn="${v.variantNameEn}":`);
          console.log(`  -> color: "${parsed.color}", size: "${parsed.size}", attrs:`, parsed.attributes);
        });
      }
    }
  }
}

findSocksProduct().catch(console.error);
