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

async function investigateProductVariants() {
  const pid = "83E99ECE-9B27-44A7-925A-D32E980BB6AB";
  console.log(`=== INVESTIGATING CJ PRODUCT DETAIL & VARIANTS FOR PID: ${pid} ===`);

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    console.error("No CJ_API_KEY");
    return;
  }

  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.accessToken;
  const headers = { "Content-Type": "application/json", "CJ-Access-Token": token };

  // 1. Fetch Product Query (/product/query?pid=...)
  console.log("\n--- 1. GET /product/query?pid=" + pid + " ---");
  const resDetail = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pid}`, { headers });
  const jsonDetail = await resDetail.json();

  console.log("HTTP Status:", resDetail.status);
  console.log("CJ Code:", jsonDetail.code);
  console.log("CJ Message:", jsonDetail.message);

  if (jsonDetail.data) {
    const d = jsonDetail.data;
    console.log("Data Keys:", Object.keys(d));
    console.log("productNameEn:", d.productNameEn || d.productName);
    console.log("productSku:", d.productSku);
    console.log("variants field exists:", "variants" in d, Array.isArray(d.variants) ? `Array length: ${d.variants.length}` : typeof d.variants);
    console.log("variantsList field exists:", "variantsList" in d, Array.isArray(d.variantsList) ? `Array length: ${d.variantsList.length}` : typeof d.variantsList);

    // Print all keys in `d` that contain Array
    Object.keys(d).forEach((k) => {
      if (Array.isArray(d[k])) {
        console.log(`Field '${k}' is Array with ${d[k].length} items`);
        if (d[k].length > 0) {
          console.log(`Sample item in '${k}':`, Object.keys(d[k][0]));
        }
      }
    });

    const variantList = d.variants || d.variantsList || d.variantList || [];
    console.log(`Total Variants Found: ${variantList.length}`);
    variantList.forEach((v: any, idx: number) => {
      console.log(`\nVariant [${idx + 1}]:`, {
        vid: v.vid,
        variantName: v.variantName,
        variantNameEn: v.variantNameEn,
        variantSku: v.variantSku,
        variantKey: v.variantKey,
        variantImage: v.variantImage,
        variantSellPrice: v.variantSellPrice,
        variantWeight: v.variantWeight,
        inventoryNum: v.inventoryNum,
      });
    });
  } else {
    console.log("No data returned:", jsonDetail);
  }

  // 2. Fetch Variant List endpoint if any (/product/variant/queryByPid?pid=... or similar)
  console.log("\n--- 2. Testing alternative variant endpoints ---");
  const altEndpoints = [
    `/product/variant/queryByPid?pid=${pid}`,
    `/product/variant/list?pid=${pid}`,
    `/product/variant/query?pid=${pid}`,
    `/product/stock/queryByPid?pid=${pid}`,
  ];

  for (const ep of altEndpoints) {
    try {
      const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1${ep}`, { headers });
      const json = await res.json();
      console.log(`Endpoint: ${ep}`);
      console.log(`CJ Code: ${json.code}, Message: ${json.message}`);
      if (json.code === 200 && json.data) {
        console.log("Data keys/len:", Array.isArray(json.data) ? json.data.length : Object.keys(json.data));
      }
    } catch (e) {}
  }
}

investigateProductVariants().catch(console.error);
