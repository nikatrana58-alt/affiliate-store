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

async function testRealCategoryId() {
  const apiKey = process.env.CJ_API_KEY;
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.accessToken;
  const headers = { "Content-Type": "application/json", "CJ-Access-Token": token };

  // Phones & Accessories: E9FDC79A-8365-4CA6-AC23-64D971F08B8B
  console.log("--- Testing Phones & Accessories Category UUID ---");
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=5&categoryId=E9FDC79A-8365-4CA6-AC23-64D971F08B8B", { headers });
  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Code:", json.code);
  console.log("Message:", json.message);
  if (json.data) {
    console.log("Total:", json.data.total);
    console.log("Items returned:", json.data.list?.length);
    if (json.data.list?.length > 0) {
      console.log("First product title:", json.data.list[0].productNameEn || json.data.list[0].productName);
    }
  }
}

testRealCategoryId().catch(console.error);
