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

async function discoverMoreEndpoints() {
  const apiKey = process.env.CJ_API_KEY;
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.accessToken;
  const headers = { "Content-Type": "application/json", "CJ-Access-Token": token };

  console.log("=== TESTING CJ ACCOUNT BALANCE & ORDER PAYMENT ENDPOINTS ===");

  const candidates = [
    { url: "/shopping/order/confirmOrder", method: "GET" },
    { url: "/shopping/order/confirmOrder", method: "POST" },
    { url: "/shopping/order/pay", method: "POST" },
    { url: "/shopping/pay/payBalance", method: "POST" },
    { url: "/shopping/pay/balancePay", method: "POST" },
    { url: "/shopping/order/payWithBalance", method: "POST" },
    { url: "/shopping/order/payment", method: "POST" },
    { url: "/shopping/order/payByWallet", method: "POST" },
    { url: "/shopping/payByBalance", method: "POST" },
    { url: "/shopping/payByWallet", method: "POST" },
    { url: "/shopping/order/payBalanceV2", method: "POST" },
    { url: "/shopping/payBalanceV2", method: "POST" },
    { url: "/shopping/order/pay/balance", method: "POST" },
    { url: "/user/getAccountBalance", method: "GET" },
    { url: "/user/getBalance", method: "GET" },
    { url: "/account/getAccountBalance", method: "GET" },
    { url: "/shopping/account/getAccountBalance", method: "GET" },
    { url: "/shopping/order/getPayUrl", method: "POST" },
    { url: "/shopping/order/getPayUrl", method: "GET" },
  ];

  for (const c of candidates) {
    try {
      const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1${c.url}`, {
        method: c.method,
        headers,
        body: c.method === "POST" ? JSON.stringify({ cjOrderId: "TEST_ORDER" }) : undefined,
      });
      const json = await res.json();
      console.log(`\nEndpoint: [${c.method}] ${c.url}`);
      console.log(`HTTP Status: ${res.status}`);
      console.log(`CJ Code: ${json.code}`);
      console.log(`CJ Message: ${json.message}`);
      if (json.data) console.log(`CJ Data:`, json.data);
    } catch (err) {
      console.error(`Endpoint [${c.method}] ${c.url} failed:`, err);
    }
  }
}

discoverMoreEndpoints().catch(console.error);
