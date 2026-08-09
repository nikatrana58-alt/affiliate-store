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

async function testCategories() {
  const apiKey = process.env.CJ_API_KEY;
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.accessToken;
  const headers = { "Content-Type": "application/json", "CJ-Access-Token": token };

  // Test 1: GET /product/category/getCategory
  console.log("--- 1. /product/category/getCategory ---");
  const r1 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/category/getCategory", { headers });
  console.log("r1 status:", r1.status, await r1.json());

  // Test 2: GET /product/getCategory
  console.log("\n--- 2. /product/getCategory ---");
  const r2 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/getCategory", { headers });
  console.log("r2 status:", r2.status, await r2.json());

  // Test 3: GET /product/category/list
  console.log("\n--- 3. /product/category/list ---");
  const r3 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/category/list", { headers });
  console.log("r3 status:", r3.status, await r3.json());

  // Test 4: Inspect categoryId from a real product list item!
  console.log("\n--- 4. Inspect category fields in real products ---");
  const r4 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=5", { headers });
  const j4 = await r4.json();
  if (j4.data?.list) {
    j4.data.list.forEach((item: any) => {
      console.log({
        pid: item.pid,
        name: item.productNameEn || item.productName,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        oneCategoryId: item.oneCategoryId,
        oneCategoryName: item.oneCategoryName,
        twoCategoryId: item.twoCategoryId,
        twoCategoryName: item.twoCategoryName,
        threeCategoryName: item.threeCategoryName,
      });
    });
  }
}

testCategories().catch(console.error);
