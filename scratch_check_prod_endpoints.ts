async function checkProdEndpoints() {
  console.log("=== CHECKING PRODUCTION ENDPOINTS (https://ra2z.shop) ===");

  // 1. Check CJ Health
  try {
    console.log("\n1. GET https://ra2z.shop/api/cj/health ...");
    const res1 = await fetch("https://ra2z.shop/api/cj/health");
    console.log("Status:", res1.status, res1.statusText);
    const body1 = await res1.text();
    console.log("Response Body:", body1);
  } catch (err) {
    console.error("Fetch 1 failed:", err);
  }

  // 2. Check Admin CJ Search without session cookie (Expect 401 Unauthorized)
  try {
    console.log("\n2. GET https://ra2z.shop/api/admin/cj/search?keyword=bag (Unauthenticated) ...");
    const res2 = await fetch("https://ra2z.shop/api/admin/cj/search?keyword=bag");
    console.log("Status:", res2.status, res2.statusText);
    const body2 = await res2.text();
    console.log("Response Body:", body2);
  } catch (err) {
    console.error("Fetch 2 failed:", err);
  }
}

checkProdEndpoints();
