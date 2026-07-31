import fs from "fs";
import path from "path";

// Load .env.local manually
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

async function verifyAllThreeSearchTypes() {
  console.log("=== COMPREHENSIVE CJ SEARCH ENGINE VERIFICATION ===");

  // TEST 1: KEYWORD SEARCH ("Pajama")
  console.log("\n--- TEST 1: KEYWORD SEARCH ('Pajama') ---");
  const resKw = await cjDropshipping.getProductList({
    pageNum: 1,
    pageSize: 5,
    keyWord: "Pajama",
  });

  console.log(`Detected Type : "${resKw.searchTypeDetected}"`);
  console.log(`Returned Items: ${resKw.list.length} products`);
  if (resKw.list.length > 0) {
    console.log(`Sample 1 Title: "${resKw.list[0].productNameEn || resKw.list[0].productName}"`);
    console.log(`Sample 1 SKU  : "${resKw.list[0].productSku}"`);
  }

  if (resKw.list.length === 0) {
    throw new Error("Keyword search 'Pajama' returned 0 products!");
  }
  console.log("  ✓ TEST 1 (KEYWORD SEARCH) PASSED!");

  // TEST 2: SKU SEARCH ("CJNSSYTZ05449-Black-L")
  console.log("\n--- TEST 2: SKU SEARCH ('CJNSSYTZ05449-Black-L') ---");
  const resSku = await cjDropshipping.getProductList({
    pageNum: 1,
    pageSize: 5,
    productSku: "CJNSSYTZ05449-Black-L",
  });

  console.log(`Detected Type : "${resSku.searchTypeDetected}"`);
  console.log(`Returned Items: ${resSku.list.length} products`);
  if (resSku.list.length > 0) {
    console.log(`Sample Title  : "${resSku.list[0].productNameEn || resSku.list[0].productName}"`);
    console.log(`Sample SKU    : "${resSku.list[0].productSku}"`);
    console.log(`Sample PID    : "${resSku.list[0].pid}"`);
  }

  if (resSku.list.length === 0 || !resSku.list[0].productSku?.includes("CJNSSYTZ05449")) {
    throw new Error("SKU search 'CJNSSYTZ05449-Black-L' failed!");
  }
  console.log("  ✓ TEST 2 (SKU SEARCH) PASSED!");

  // TEST 3: CJ PRODUCT ID SEARCH ("11648ED0-19C0-4154-919A-A916BE6B0913")
  console.log("\n--- TEST 3: PRODUCT ID SEARCH ('11648ED0-19C0-4154-919A-A916BE6B0913') ---");
  const resPid = await cjDropshipping.getProductList({
    pageNum: 1,
    pageSize: 5,
    pid: "11648ED0-19C0-4154-919A-A916BE6B0913",
  });

  console.log(`Detected Type : "${resPid.searchTypeDetected}"`);
  console.log(`Returned Items: ${resPid.list.length} products`);
  if (resPid.list.length > 0) {
    console.log(`Sample Title  : "${resPid.list[0].productNameEn || resPid.list[0].productName}"`);
    console.log(`Sample PID    : "${resPid.list[0].pid}"`);
  }

  if (resPid.list.length === 0 || resPid.list[0].pid !== "11648ED0-19C0-4154-919A-A916BE6B0913") {
    throw new Error("Product ID search '11648ED0-19C0-4154-919A-A916BE6B0913' failed!");
  }
  console.log("  ✓ TEST 3 (PRODUCT ID SEARCH) PASSED!");

  console.log("\n======================================================");
  console.log("🎉 ALL 3 SEARCH TYPES VERIFIED AND WORKING PERFECTLY!");
  console.log("======================================================\n");
}

verifyAllThreeSearchTypes().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
