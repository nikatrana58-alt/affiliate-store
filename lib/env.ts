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
    console.warn(`[validateEnv] WARNING: Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://curatedfinds.store",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    cjApiKey: process.env.CJ_API_KEY || "",
    emailProvider: process.env.EMAIL_PROVIDER || "mock",
    isProduction: process.env.NODE_ENV === "production",
  };
}

export const env = validateEnv();
