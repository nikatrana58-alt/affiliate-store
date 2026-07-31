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

async function testAllSearches() {
  console.log("=== CJ SEARCH ENGINE COMPREHENSIVE BENCHMARK & VERIFICATION ===");

  const inputs = [
    // Requirement 9: Multiple SKUs
    { label: "SKU 1 (Variant with hyphens)", query: "CJNSSYTZ05449-Black-L" },
    { label: "SKU 2 (Base SKU)", query: "CJNSSYTZ05449" },
    { label: "SKU 3 (Watch SKU)", query: "CJSD3017777" },

    // Requirement 9: Multiple Product IDs
    { label: "PID 1 (Numeric ID)", query: "2082405828648894466" },
    { label: "PID 2 (Numeric ID)", query: "1852504859013066752" },

    // Requirement 9: Multiple Keywords
    { label: "Keyword 1", query: "watch" },
    { label: "Keyword 2", query: "loungewear" },
    { label: "Keyword 3", query: "headphones" },
    { label: "Keyword 4", query: "dress" },
  ];

  let successCount = 0;

  for (const item of inputs) {
    console.log(`\n======================================================`);
    console.log(`TESTING: [${item.label}] -> Query: "${item.query}"`);
    console.log(`======================================================`);

    try {
      const tStart = performance.now();
      const res = await cjDropshipping.getProductList({
        keyWord: item.query,
        pageSize: 20,
      });
      const elapsedMs = performance.now() - tStart;

      console.log(`\n[RESULT] Detected Type: "${res.searchTypeDetected || 'N/A'}" | Count: ${res.list.length} | Total: ${res.total} | API Time: ${elapsedMs.toFixed(2)} ms`);

      if (res.list.length > 0) {
        successCount++;
        const top = res.list[0];
        console.log(`  Top Match: Title="${top.productNameEn || top.productName}" | PID="${top.pid}" | SKU="${top.productSku}"`);
      } else {
        console.warn(`  ⚠️ Warning: No products returned for query "${item.query}"`);
      }
    } catch (err) {
      console.error(`Search error for query "${item.query}":`, err);
    }
  }

  console.log(`\n======================================================`);
  console.log(`COMPREHENSIVE BENCHMARK COMPLETED: ${successCount}/${inputs.length} Query Types Returned Products!`);
  console.log(`======================================================\n`);
}

testAllSearches();
