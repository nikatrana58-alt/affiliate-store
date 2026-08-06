/**
 * lib/printful/config.ts
 *
 * Safe environment configuration and credential validator for Printful integration.
 */

export interface PrintfulConfig {
  apiToken: string;
  storeId?: string;
  storeName?: string;
  isConfigured: boolean;
  baseUrl: string;
}

/**
 * Returns whether Printful credentials are validly configured in environment variables.
 */
export function isPrintfulConfigured(): boolean {
  const token = process.env.PRINTFUL_API_TOKEN;
  return Boolean(token && token.trim().length > 0 && !token.includes("placeholder"));
}

/**
 * Performs startup validation on Printful environment credentials.
 * Surfaces helpful log diagnostics if credentials are missing or placeholder.
 */
export function validatePrintfulCredentials(): {
  valid: boolean;
  missing: string[];
  storeIdConfigured: boolean;
  storeNameConfigured: boolean;
} {
  const missing: string[] = [];
  const token = process.env.PRINTFUL_API_TOKEN;

  if (!token || token.trim().length === 0 || token.includes("placeholder")) {
    missing.push("PRINTFUL_API_TOKEN");
  }

  const storeIdConfigured = Boolean(
    process.env.PRINTFUL_STORE_ID &&
      process.env.PRINTFUL_STORE_ID.trim().length > 0
  );

  const storeNameConfigured = Boolean(
    process.env.PRINTFUL_STORE_NAME &&
      process.env.PRINTFUL_STORE_NAME.trim().length > 0
  );

  if (missing.length > 0) {
    console.warn(
      `[printful-config] Warning: ${missing.join(", ")} is missing or unconfigured. ` +
        "Printful module will operate in fallback mock mode."
    );
  }

  return {
    valid: missing.length === 0,
    missing,
    storeIdConfigured,
    storeNameConfigured,
  };
}

/**
 * Returns current Printful configuration object.
 */
export function getPrintfulConfig(): PrintfulConfig {
  const configured = isPrintfulConfigured();
  return {
    apiToken: process.env.PRINTFUL_API_TOKEN || "",
    storeId: process.env.PRINTFUL_STORE_ID || undefined,
    storeName: process.env.PRINTFUL_STORE_NAME || undefined,
    isConfigured: configured,
    baseUrl: "https://api.printful.com",
  };
}
