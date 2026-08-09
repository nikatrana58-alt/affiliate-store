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

async function testPayBalanceParams() {
  const apiKey = process.env.CJ_API_KEY;
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.accessToken;
  const headers = { "Content-Type": "application/json", "CJ-Access-Token": token };

  console.log("=== TESTING POST /shopping/pay/payBalance PARAMETER FORMATS ===");

  const testPayloads = [
    { orderId: "CJ123456789" },
    { orderId: ["CJ123456789"] },
    { cjOrderId: "CJ123456789" },
    { orderIdList: ["CJ123456789"] },
    { orderIds: ["CJ123456789"] },
  ];

  for (const payload of testPayloads) {
    try {
      await new Promise((r) => setTimeout(r, 1100)); // Respect 1 QPS rate limit
      const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/shopping/pay/payBalance", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log(`\nPayload:`, payload);
      console.log(`HTTP Status: ${res.status}`);
      console.log(`CJ Code: ${json.code}`);
      console.log(`CJ Message: ${json.message}`);
      if (json.data) console.log(`CJ Data:`, json.data);
    } catch (err) {
      console.error("Payload test failed:", err);
    }
  }
}

testPayBalanceParams().catch(console.error);
