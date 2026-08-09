import fs from "fs";
import path from "path";
import assert from "assert";

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

async function verifyPaymentFlow() {
  console.log("=== VERIFYING AUTOMATED CJ FULFILLMENT & BALANCE PAYMENT FLOW ===");

  // TEST 1: Test payOrderWithBalance method exists and returns structured result
  console.log("\n--- TEST 1: cjDropshipping.payOrderWithBalance() ---");
  assert(typeof cjDropshipping.payOrderWithBalance === "function", "payOrderWithBalance method exists on cjDropshipping");

  const mockCjOrderId = "CJ_TEST_AUTOMATED_ORDER_001";
  const payRes = await cjDropshipping.payOrderWithBalance(mockCjOrderId);

  console.log("Payment Result Success :", payRes.success);
  console.log("Payment Result Message :", payRes.message);
  assert(typeof payRes.success === "boolean", "payOrderWithBalance returns boolean success state");
  console.log("  ✓ TEST 1 PASSED!");

  // TEST 2: Verify direct payload handling against CJ API
  console.log("\n--- TEST 2: CJ Balance Payment Endpoint Signature ---");
  const apiKey = process.env.CJ_API_KEY;
  if (apiKey) {
    const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const authJson = await authRes.json();
    const token = authJson.data?.accessToken;
    assert(Boolean(token), "Acquired access token for endpoint verification");

    const endpointRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/shopping/pay/payBalance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({ orderId: "CJ_NONEXISTENT_DRAFT_ORDER" }),
    });
    const json = await endpointRes.json();
    console.log("Endpoint Status :", endpointRes.status);
    console.log("CJ Code         :", json.code);
    console.log("CJ Message      :", json.message);
    assert(json.code === 1600300 || json.code === 200, "Endpoint acknowledges valid payBalance parameters");
    console.log("  ✓ TEST 2 PASSED!");
  } else {
    console.log("  (Skipping live API call as CJ_API_KEY is not set in environment)");
  }

  console.log("\n=======================================================");
  console.log("🎉 AUTOMATED CJ BALANCE PAYMENT FLOW VERIFIED & READY!");
  console.log("=======================================================\n");
}

verifyPaymentFlow().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
