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

async function testRawCJApi() {
  const apiKey = process.env.CJ_API_KEY;
  console.log("CJ_API_KEY configured:", Boolean(apiKey));

  if (!apiKey) {
    console.error("No CJ_API_KEY found in process.env");
    return;
  }

  // 1. Get Token
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  const authJson = await authRes.json();
  console.log("\n--- Auth Response ---");
  console.log("Auth Code:", authJson.code);
  console.log("Auth Message:", authJson.message);
  const token = authJson.data?.accessToken;
  console.log("Token Acquired:", Boolean(token));

  if (!token) return;

  const headers = {
    "Content-Type": "application/json",
    "CJ-Access-Token": token,
  };

  // 2. Test Empty Search: GET /product/list?pageNum=1&pageSize=20
  console.log("\n--- Test 1: Empty Search (/product/list?pageNum=1&pageSize=20) ---");
  const res1 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=20", { headers });
  const json1 = await res1.json();
  console.log("HTTP Status:", res1.status);
  console.log("CJ Code:", json1.code);
  console.log("CJ Message:", json1.message);
  console.log("CJ Result/Data Keys:", Object.keys(json1));
  if (json1.data) {
    console.log("data keys:", Object.keys(json1.data));
    console.log("data.pageNum:", json1.data.pageNum);
    console.log("data.pageSize:", json1.data.pageSize);
    console.log("data.total:", json1.data.total);
    console.log("data.list length:", Array.isArray(json1.data.list) ? json1.data.list.length : "Not an array");
    if (json1.data.list && json1.data.list.length > 0) {
      console.log("Sample 1 item keys:", Object.keys(json1.data.list[0]));
      console.log("Sample 1 item pid:", json1.data.list[0].pid);
      console.log("Sample 1 item name:", json1.data.list[0].productNameEn || json1.data.list[0].productName);
    }
  }

  // 3. Test Keyword Search "bag"
  console.log("\n--- Test 2: Keyword Search 'bag' (/product/list?pageNum=1&pageSize=20&keyWord=bag) ---");
  const res2 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=20&keyWord=bag", { headers });
  const json2 = await res2.json();
  console.log("HTTP Status:", res2.status);
  console.log("CJ Code:", json2.code);
  console.log("CJ Message:", json2.message);
  if (json2.data) {
    console.log("data.total:", json2.data.total);
    console.log("data.list length:", Array.isArray(json2.data.list) ? json2.data.list.length : "Not an array");
  }

  // 4. Test Category Filter "Phones & Accessories"
  console.log("\n--- Test 3: Category Filter 'Phones & Accessories' ---");
  const res3 = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=20&categoryId=Phones%20%26%20Accessories", { headers });
  const json3 = await res3.json();
  console.log("HTTP Status:", res3.status);
  console.log("CJ Code:", json3.code);
  console.log("CJ Message:", json3.message);
  if (json3.data) {
    console.log("data.total:", json3.data.total);
    console.log("data.list length:", Array.isArray(json3.data.list) ? json3.data.list.length : "Not an array");
  }

  // 5. Test CJ Get Category List Endpoint to see real Category IDs!
  console.log("\n--- Test 4: Get CJ Category List ---");
  const resCat = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/category/getCategory", { headers });
  const jsonCat = await resCat.json();
  console.log("HTTP Status:", resCat.status);
  console.log("CJ Code:", jsonCat.code);
  console.log("CJ Message:", jsonCat.message);
  if (jsonCat.data && Array.isArray(jsonCat.data)) {
    console.log("First 5 Root Categories:", jsonCat.data.slice(0, 5).map((c: any) => ({
      categoryFirstId: c.categoryFirstId,
      categoryFirstName: c.categoryFirstName,
      categoryFirstListLength: c.categoryFirstList?.length
    })));
  }
}

testRawCJApi().catch(console.error);
