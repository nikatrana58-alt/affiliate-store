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

async function discoverPaymentEndpoints() {
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

  console.log("=== DISCOVERING CJ OPEN API PAYMENT ENDPOINTS ===");

  const candidateEndpoints = [
    "/shopping/order/payBalance",
    "/shopping/order/payBalanceV2",
    "/shopping/payBalance",
    "/shopping/order/pay",
    "/shopping/pay",
    "/shopping/order/confirmOrder",
    "/shopping/order/payOrder",
    "/shopping/order/balancePay",
    "/shopping/pay/balance",
    "/shopping/order/payByBalance",
  ];

  for (const ep of candidateEndpoints) {
    try {
      const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1${ep}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ cjOrderId: "TEST_ORDER_ID" }),
      });
      const json = await res.json();
      console.log(`\nEndpoint: ${ep}`);
      console.log(`HTTP Status: ${res.status}`);
      console.log(`CJ Code: ${json.code}`);
      console.log(`CJ Message: ${json.message}`);
    } catch (err) {
      console.error(`Endpoint: ${ep} failed`, err);
    }
  }
}

discoverPaymentEndpoints().catch(console.error);
