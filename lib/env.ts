/**
 * lib/env.ts
 *
 * Production Environment Variables Validator & Sanitizer.
 */

export function validateEnv() {
  const requiredPublic = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const missing: string[] = [];

  for (const envVar of requiredPublic) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[validateEnv] WARNING: Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Warn when CJ credentials are absent — service will operate in mock mode.
  const cjApiKey = process.env.CJ_API_KEY || "";
  const cjMcpToken = process.env.CJ_MCP_TOKEN || "";
  const cjMissing: string[] = [];
  if (!cjApiKey || cjApiKey.includes("placeholder")) cjMissing.push("CJ_API_KEY");
  if (!cjMcpToken) cjMissing.push("CJ_MCP_TOKEN");
  if (cjMissing.length > 0) {
    console.warn(
      `[validateEnv] CJ Dropshipping credentials not fully configured (${cjMissing.join(", ")}). ` +
        "CJ service will run in mock/dry-run mode."
    );
  }

  // Warn when Printful credentials are absent — service will operate in mock mode.
  const printfulApiToken = process.env.PRINTFUL_API_TOKEN || "";
  const printfulStoreId = process.env.PRINTFUL_STORE_ID || "";
  if (!printfulApiToken || printfulApiToken.includes("placeholder")) {
    console.warn(
      "[validateEnv] PRINTFUL_API_TOKEN credentials not fully configured. " +
        "Printful service will run in mock/dry-run mode."
    );
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://curatedfinds.store",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    cjApiKey,
    cjMcpToken,
    printfulApiToken,
    printfulStoreId,
    emailProvider: process.env.EMAIL_PROVIDER || "mock",
    isProduction: process.env.NODE_ENV === "production",
  };
}

export const env = validateEnv();
