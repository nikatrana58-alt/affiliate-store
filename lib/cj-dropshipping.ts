/**
 * lib/cj-dropshipping.ts
 *
 * Official CJ Dropshipping Open API Service Client.
 * Handles authentication, product/stock validation, destination verification,
 * order submission to CJ, and tracking info retrieval.
 * Includes rate-limit backoff, token caching, and automated retries.
 *
 * Authentication (CJ Open API 2.0):
 *   - CJ_API_KEY  → exchanged for a short-lived accessToken via
 *                   POST /authentication/getAccessToken { apiKey }
 *   - CJ_MCP_TOKEN → stored for MCP / AI-agent integrations (not used in REST calls)
 *   - accessToken is passed as the `CJ-Access-Token` header on every subsequent request.
 */

import type {
  ValidateStockItem,
  StockValidationResult,
  ShippingValidationResult,
  CreateSupplierOrderParams,
  SupplierOrderResult,
  SupplierTrackingInfo,
} from "@/lib/suppliers/types";

const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

export type CJAuthTokenResponse = {
  code: number;
  result?: boolean;
  message?: string;
  data?: {
    openId?: number;
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiryDate?: string;
    refreshTokenExpiryDate?: string;
  };
};

export type CJApiResponse<T = unknown> = {
  code: number;
  result?: boolean | T;
  data?: T;
  message?: string;
  requestId?: string;
};

export type CJSearchType = "PRODUCT_ID" | "SKU" | "KEYWORD";

export function detectCJSearchType(input?: string): {
  type: CJSearchType;
  cleanInput: string;
} {
  if (!input || !input.trim()) {
    return { type: "KEYWORD", cleanInput: "" };
  }

  // Trim only leading/trailing whitespace (Requirement 5)
  const trimmed = input.trim();

  // Requirement 1: Numeric only -> Treat as CJ Product ID
  if (/^\d+$/.test(trimmed)) {
    return { type: "PRODUCT_ID", cleanInput: trimmed };
  }

  // Requirement 1: Starts with "CJ" or resembles a SKU -> Treat as SKU
  // Requirement 4: Preserves ALL special characters in SKUs ("-", "_", ".", "/")
  if (/^CJ/i.test(trimmed) || /^[A-Z0-9]{2,}[-_.\/][A-Z0-9-_.\/]+$/i.test(trimmed)) {
    return { type: "SKU", cleanInput: trimmed };
  }

  // Requirement 1: Otherwise -> Treat as Keyword
  return { type: "KEYWORD", cleanInput: trimmed };
}

export type CJVariant = {
  vid: string;
  pid: string;
  variantName?: string | null;
  variantNameEn?: string;
  variantImage?: string;
  variantSku?: string;
  variantKey?: string;
  variantWeight?: number;
  variantSellPrice?: number;
  variantSugSellPrice?: number;
  inventoryNum?: number | null;
};

export type CJProductDetail = {
  pid: string;
  productName?: string;
  productNameEn?: string;
  productSku?: string;
  productImage?: string;
  productWeight?: string;
  categoryName?: string;
  sellPrice?: string;
  description?: string;
  variants?: CJVariant[];
  [key: string]: unknown;
};

export type CJInventoryItem = {
  vid: string;
  areaEn?: string;
  countryCode?: string;
  storageNum?: number;
  totalInventoryNum?: number;
  factoryInventoryNum?: number;
  [key: string]: unknown;
};

export type CJShippingOption = {
  logisticName?: string;
  logisticPrice?: number;       // Shipping cost in USD (the field used for pricing)
  logisticAging?: string;       // Delivery time estimate, e.g. "7-12"
  totalPostageFee?: number;     // Total postage fee (confirmed present in live API response)
  taxesFee?: number;            // Taxes fee (confirmed present; typically 0 for standard routes)
  clearanceOperationFee?: number; // Clearance fee (confirmed present; typically 0)
  [key: string]: unknown;
};

/**
 * Runtime credential validation.
 * Call this once at startup (e.g. in lib/env.ts) to surface missing env vars early.
 */
export function validateCJCredentials(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.CJ_API_KEY) missing.push("CJ_API_KEY");
  if (!process.env.CJ_MCP_TOKEN) missing.push("CJ_MCP_TOKEN");
  return { valid: missing.length === 0, missing };
}

class CJDropshippingService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private inflightTokenPromise: Promise<string> | null = null;
  private responseCache = new Map<string, { data: any; expiresAt: number }>();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes TTL

  private getCached<T>(key: string): T | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.responseCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /** Clears the in-memory CJ API response cache on demand. */
  clearCache(): void {
    this.responseCache.clear();
  }

  /** Returns true when a real CJ_API_KEY is present so the service can make live API calls. */
  private isConfigured(): boolean {
    const apiKey = process.env.CJ_API_KEY;
    return Boolean(apiKey && apiKey.trim().length > 0 && !apiKey.includes("placeholder"));
  }

  private getApiKey(): string {
    return process.env.CJ_API_KEY ?? "";
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /**
   * Fetches an access token from CJ Dropshipping API using the CJ_API_KEY.
   * Caches the token in memory until it is within 60 s of expiration.
   * Deduplicates concurrent inflight requests.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60_000) {
      return this.cachedToken;
    }

    if (!this.isConfigured()) {
      console.warn(
        "[cj-dropshipping] CJ_API_KEY is not configured. Operating in mock/dry-run mode."
      );
      return "mock_cj_access_token";
    }

    if (this.inflightTokenPromise) {
      return this.inflightTokenPromise;
    }

    this.inflightTokenPromise = (async () => {
      const apiKey = this.getApiKey();

      try {
        const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });

        if (res.status === 429) {
          throw new Error("CJ API authentication rate limit reached (HTTP 429). Please retry in a moment.");
        }

        if (!res.ok) {
          throw new Error(`Authentication HTTP Error ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as CJAuthTokenResponse;
        const token = data.data?.accessToken;

        if (data.code !== 200 || !token) {
          throw new Error(
            `CJ Auth Failed (code ${data.code}): ${data.message ?? "Invalid API key"}`
          );
        }

        this.cachedToken = token;

        const expiryStr = data.data?.accessTokenExpiryDate;
        this.tokenExpiresAt = expiryStr
          ? new Date(expiryStr).getTime()
          : now + 23 * 60 * 60 * 1000;

        console.info("[cj-dropshipping] Access token successfully acquired.");
        return this.cachedToken;
      } catch (err) {
        console.error("[cj-dropshipping] Failed to acquire access token:", err instanceof Error ? err.message : String(err));
        throw err;
      } finally {
        this.inflightTokenPromise = null;
      }
    })();

    return this.inflightTokenPromise;
  }

  // ---------------------------------------------------------------------------
  // Connection test
  // ---------------------------------------------------------------------------

  /**
   * Verifies that the configured CJ_API_KEY can successfully authenticate
   * and that the CJ Open API is reachable.
   * Returns a structured result for use in admin health / diagnostic endpoints.
   */
  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    tokenAcquired?: boolean;
    apiKeyConfigured: boolean;
    mcpTokenConfigured: boolean;
  }> {
    const apiKeyConfigured = this.isConfigured();
    const mcpTokenConfigured = Boolean(
      process.env.CJ_MCP_TOKEN && process.env.CJ_MCP_TOKEN.trim().length > 0
    );

    if (!apiKeyConfigured) {
      return {
        success: false,
        latencyMs: 0,
        message:
          "CJ_API_KEY is not configured. Set a valid API key to enable live API access.",
        tokenAcquired: false,
        apiKeyConfigured: false,
        mcpTokenConfigured,
      };
    }

    const start = Date.now();

    // Force a fresh token fetch by clearing cache for the duration of this test.
    const savedToken = this.cachedToken;
    const savedExpiry = this.tokenExpiresAt;
    this.cachedToken = null;
    this.tokenExpiresAt = 0;

    try {
      const token = await this.getAccessToken();
      const latencyMs = Date.now() - start;
      const acquired = token !== "mock_cj_access_token" && token.length > 0;

      return {
        success: acquired,
        latencyMs,
        message: acquired
          ? "CJ Open API authenticated successfully."
          : "Token request returned an unexpected value.",
        tokenAcquired: acquired,
        apiKeyConfigured: true,
        mcpTokenConfigured,
      };
    } catch (err) {
      // Restore cache so normal operations aren't disrupted after a failed test.
      this.cachedToken = savedToken;
      this.tokenExpiresAt = savedExpiry;

      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "Unknown authentication error.",
        tokenAcquired: false,
        apiKeyConfigured: true,
        mcpTokenConfigured,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Low-level request helper
  // ---------------------------------------------------------------------------

  /**
   * Low-level API request wrapper with automated retries and rate limit protection.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 5
  ): Promise<CJApiResponse<T>> {
    const token = await this.getAccessToken();

    const url = endpoint.startsWith("http") ? endpoint : `${CJ_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(options.headers as Record<string, string>),
    };

    let attempt = 0;
    let delay = 1000;

    while (attempt < retries) {
      attempt++;
      try {
        const res = await fetch(url, { ...options, headers });

        if (res.status === 429) {
          console.warn(
            `[cj-dropshipping] Rate limited (HTTP 429). Retrying attempt ${attempt}/${retries} in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (!res.ok) {
          try {
            const errJson = (await res.json()) as CJApiResponse<T>;
            if (errJson && typeof errJson.code === "number") {
              return errJson;
            }
          } catch {
            // Not JSON response
          }
          throw new Error(`CJ API HTTP Error ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as CJApiResponse<T>;

        // Check if CJ returned a rate-limit or frequency error inside JSON body
        if (
          data &&
          typeof data.message === "string" &&
          (data.message.toLowerCase().includes("too many requests") ||
           data.message.toLowerCase().includes("frequency") ||
           data.message.toLowerCase().includes("rate limit"))
        ) {
          if (attempt < retries) {
            console.warn(
              `[cj-dropshipping] CJ API rate limit notice inside payload: "${data.message}". Retrying attempt ${attempt}/${retries} in ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }

        return data;
      } catch (err) {
        if (attempt >= retries) {
          console.error(`[cj-dropshipping] Request failed after ${attempt} attempts:`, err);
          throw err;
        }
        console.warn(
          `[cj-dropshipping] Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`,
          err
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error("CJ API rate limit reached. Please wait a few seconds and click Retry.");
  }

  // ---------------------------------------------------------------------------
  // Product & Inventory API Methods
  // ---------------------------------------------------------------------------

  /**
   * Fetches product list from CJ Dropshipping API v2.0 with optional search parameters.
   */
  async getProductList(
    options: {
      pageNum?: number;
      pageSize?: number;
      keyWord?: string;
      keyword?: string;
      productName?: string;
      productSku?: string;
      categoryId?: string;
      pid?: string;
    } | number = 1,
    pageSizeArg = 10
  ): Promise<{ list: CJProductDetail[]; total: number; searchTypeDetected?: CJSearchType }> {
    if (!this.isConfigured()) {
      throw new Error("CJ_API_KEY is not configured on server.");
    }

    let pageNum = 1;
    let pageSize = 10;
    let rawInput: string | undefined;
    let categoryId: string | undefined;
    let pid: string | undefined;
    let productSku: string | undefined;
    let productName: string | undefined;

    if (typeof options === "number") {
      pageNum = options;
      pageSize = pageSizeArg;
    } else if (typeof options === "object") {
      pageNum = options.pageNum ?? 1;
      pageSize = options.pageSize ?? 10;
      rawInput = options.keyWord || options.keyword || options.productName || options.productSku || options.pid;
      categoryId = options.categoryId;
      pid = options.pid;
      productSku = options.productSku;
      productName = options.productName;
    }

    // 1. Classify Search Input Type
    let detectedType: CJSearchType = "KEYWORD";

    if (pid?.trim()) {
      detectedType = "PRODUCT_ID";
    } else if (productSku?.trim()) {
      detectedType = "SKU";
    } else if (rawInput?.trim()) {
      const classification = detectCJSearchType(rawInput);
      detectedType = classification.type;

      if (detectedType === "PRODUCT_ID") {
        pid = classification.cleanInput;
      } else if (detectedType === "SKU") {
        productSku = classification.cleanInput; // PRESERVES "-" AND SPECIAL CHARACTERS!
      } else {
        productName = classification.cleanInput;
      }
    }

    // 2. Build Query Payload
    const query = new URLSearchParams();
    query.set("pageNum", pageNum.toString());
    query.set("pageSize", pageSize.toString());

    let hasActiveSearchQuery = false;

    if (pid?.trim()) {
      query.set("pid", pid.trim());
      hasActiveSearchQuery = true;
    } else if (productSku?.trim()) {
      query.set("productSku", productSku.trim());
      hasActiveSearchQuery = true;
    } else if (productName?.trim() || rawInput?.trim()) {
      const kw = (productName || rawInput || "").trim();
      query.set("keyWord", kw);
      hasActiveSearchQuery = true;
    }

    if (categoryId?.trim()) query.set("categoryId", categoryId.trim());

    const queryPayload = Object.fromEntries(query.entries());

    // 3. Log Outgoing CJ API Request Details (Requirement 2)
    const tReqStart = performance.now();
    console.info(`[cj-search] User Search Input   : "${rawInput || pid || productSku || productName || ""}"`);
    console.info(`[cj-search] Classified Type     : "${detectedType}"`);
    console.info(`[cj-search] Outgoing CJ Request  : Method=GET, Endpoint="/product/list", Payload=`, queryPayload);

    const endpointUrl = `/product/list?${query.toString()}`;
    const cacheKey = `list:${query.toString()}`;

    // Requirement 4: Do not return cached products when an active search query exists
    if (!hasActiveSearchQuery) {
      const cached = this.getCached<{ list: CJProductDetail[]; total: number }>(cacheKey);
      if (cached) {
        const cachedLatencyMs = performance.now() - tReqStart;
        console.info(`[cj-search] CACHE HIT (Browsing default catalog) | Latency: ${cachedLatencyMs.toFixed(2)} ms | Returned: ${cached.list.length} products`);
        return { ...cached, searchTypeDetected: detectedType };
      }
    }

    try {
      let res = await this.request<{ list: CJProductDetail[]; total: number }>(endpointUrl);

      // Verify CJ response status code (Do not convert non-200 / 1600200 error responses into empty arrays)
      if (res.code !== 200) {
        if (res.code === 1600200 || (res.message && res.message.toLowerCase().includes("too many requests"))) {
          throw new Error("CJ API rate limit reached (1 req/sec QPS limit). Please wait a moment and try again.");
        }
        throw new Error(`CJ API Error (code ${res.code}): ${res.message || "Failed to fetch products from CJ Dropshipping"}`);
      }

      let dataPayload = res.data ?? (typeof res.result === "object" ? (res.result as { list: CJProductDetail[]; total: number }) : undefined);
      let items = dataPayload?.list || [];

      console.info(`[cj-search] Incoming CJ Response : Status=${res.code ?? 200}, RawCount=${items.length}`);

      // 4. Multi-tiered SKU Fallback Resolution for Variant SKUs & Base SKUs
      if (detectedType === "SKU" && items.length === 0 && productSku) {
        console.info(`[cj-search] SKU Lookup for "${productSku}" returned 0 items from /product/list. Executing multi-tiered SKU resolution...`);

        // Tier 1: Query CJ Open API /product/query?variantSku= for Variant SKU resolution
        try {
          const varQueryRes = await this.request<{ pid: string; productName?: string; productNameEn?: string }>(
            `/product/query?variantSku=${encodeURIComponent(productSku)}`
          );

          const matchedPid = varQueryRes.data?.pid;
          if (varQueryRes.code === 200 && matchedPid) {
            console.info(`[cj-search] Variant SKU "${productSku}" resolved to PID ${matchedPid}. Fetching full product record...`);
            const pidQueryRes = await this.request<{ list: CJProductDetail[]; total: number }>(
              `/product/list?pageNum=1&pageSize=10&pid=${encodeURIComponent(matchedPid)}`
            );
            const pidPayload = pidQueryRes.data ?? (typeof pidQueryRes.result === "object" ? (pidQueryRes.result as { list: CJProductDetail[]; total: number }) : undefined);
            if (pidPayload?.list && pidPayload.list.length > 0) {
              items = pidPayload.list;
            }
          }
        } catch (variantErr) {
          console.info(`[cj-search] Variant SKU query note:`, variantErr instanceof Error ? variantErr.message : variantErr);
        }

        // Tier 2: Base SKU Fallback (if variant SKU was concatenated like CJKT304772302BY or CJKT3047723-White-L)
        if (items.length === 0) {
          let baseSku: string | undefined;
          if (productSku.includes("-")) {
            baseSku = productSku.split("-")[0].trim();
          } else if (productSku.length > 11 && /^CJ[A-Z]{2}\d{7}/i.test(productSku)) {
            baseSku = productSku.slice(0, 11);
          }

          if (baseSku && baseSku !== productSku) {
            console.info(`[cj-search] Retrying base SKU fallback "${baseSku}" for variant SKU "${productSku}"...`);
            const fallbackQuery = new URLSearchParams();
            fallbackQuery.set("pageNum", pageNum.toString());
            fallbackQuery.set("pageSize", pageSize.toString());
            fallbackQuery.set("productSku", baseSku);
            if (categoryId?.trim()) fallbackQuery.set("categoryId", categoryId.trim());

            const fallbackRes = await this.request<{ list: CJProductDetail[]; total: number }>(`/product/list?${fallbackQuery.toString()}`);
            const fallbackPayload = fallbackRes.data ?? (typeof fallbackRes.result === "object" ? (fallbackRes.result as { list: CJProductDetail[]; total: number }) : undefined);
            if (fallbackPayload?.list && fallbackPayload.list.length > 0) {
              items = fallbackPayload.list;
              console.info(`[cj-search] Base SKU "${baseSku}" fallback successful: ${items.length} product(s) returned.`);
            }
          }
        }
      }

      const totalCount = items.length > 0 ? (dataPayload?.total || items.length) : 0;
      const latencyMs = performance.now() - tReqStart;
      const result = { list: items, total: totalCount, searchTypeDetected: detectedType };

      console.info(`[cj-search] Response Latency    : ${latencyMs.toFixed(2)} ms`);
      console.info(`[cj-search] Returned Products   : ${items.length} items (Total in CJ: ${totalCount})`);

      // Only cache default browsing catalog, never active search results (Requirement 4)
      if (!hasActiveSearchQuery && items.length > 0) {
        this.setCache(cacheKey, { list: items, total: totalCount });
      }

      return result;
    } catch (err) {
      console.error("[cj-search] Failed to execute CJ product list search:", err);
      throw err;
    }
  }

  /**
   * Queries full detail for a specific product including variants.
   */
  async getProductDetail(pid: string): Promise<CJProductDetail | null> {
    if (!this.isConfigured()) {
      throw new Error("CJ_API_KEY is not configured on server.");
    }

    const cacheKey = `detail:${pid}`;
    const cached = this.getCached<CJProductDetail>(cacheKey);
    if (cached) {
      console.info(`[cj-dropshipping] CACHE HIT for product detail PID ${pid}`);
      return cached;
    }

    try {
      const res = await this.request<CJProductDetail>(`/product/query?pid=${encodeURIComponent(pid)}`);
      const dataPayload = res.data ?? (typeof res.result === "object" ? (res.result as CJProductDetail) : undefined);

      if (res.code === 200 && dataPayload) {
        this.setCache(cacheKey, dataPayload);
        return dataPayload;
      }
      return null;
    } catch (err) {
      console.error(`[cj-dropshipping] Failed to fetch detail for pid ${pid}:`, err);
      throw err;
    }
  }

  /**
   * Queries inventory by variant ID (vid).
   */
  async getInventoryByVid(vid: string): Promise<CJInventoryItem[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const cacheKey = `inventory:${vid}`;
    const cached = this.getCached<CJInventoryItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const res = await this.request<CJInventoryItem[]>(`/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`);
      const dataPayload = res.data ?? (Array.isArray(res.result) ? (res.result as CJInventoryItem[]) : undefined);

      if (res.code === 200 && Array.isArray(dataPayload)) {
        this.setCache(cacheKey, dataPayload);
        return dataPayload;
      }
      return [];
    } catch (err) {
      console.error(`[cj-dropshipping] Failed to query stock for vid ${vid}:`, err);
      return [];
    }
  }

  /**
   * Calculates freight / shipping options for a given product variant and destination.
   */
  async getShippingInfo(params: {
    startCountryCode?: string;
    endCountryCode: string;
    vid: string;
    quantity?: number;
  }): Promise<CJShippingOption[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const cacheKey = `shipping:${params.vid}:${params.endCountryCode}:${params.startCountryCode || "CN"}`;
    const cached = this.getCached<CJShippingOption[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const res = await this.request<CJShippingOption[]>("/logistic/freightCalculate", {
        method: "POST",
        body: JSON.stringify({
          startCountryCode: params.startCountryCode || "CN",
          endCountryCode: params.endCountryCode,
          products: [{ vid: params.vid, quantity: params.quantity || 1 }],
        }),
      });

      const dataPayload = res.data ?? (Array.isArray(res.result) ? (res.result as CJShippingOption[]) : undefined);

      if (res.code === 200 && Array.isArray(dataPayload)) {
        this.setCache(cacheKey, dataPayload);
        return dataPayload;
      }
      return [];
    } catch (err) {
      console.error("[cj-dropshipping] Failed to calculate shipping info:", err);
      return [];
    }
  }

  /**
   * Validates product availability and stock quantity prior to submitting order.
   */
  async validateStock(items: ValidateStockItem[]): Promise<StockValidationResult> {
    if (!items.length) {
      return { valid: true, itemResults: [] };
    }

    if (!this.isConfigured()) {
      // Mock validation mode when live API key is not configured
      return {
        valid: true,
        itemResults: items.map((item) => ({
          supplierProductId: item.supplierProductId,
          available: true,
          stockQuantity: 999,
          requestedQuantity: item.quantity,
        })),
      };
    }

    const itemResults = [];
    let allValid = true;

    for (const item of items) {
      try {
        const queryRes = await this.request<{
          pid: string;
          quantity?: number;
          productStatus?: string;
        }>(`/product/query?pid=${encodeURIComponent(item.supplierProductId)}`);

        const product = queryRes.data ?? (typeof queryRes.result === "object" ? queryRes.result : undefined);
        const available = queryRes.code === 200 && Boolean(product);
        const stockQty = product?.quantity ?? 100;
        const isSufficient = available && stockQty >= item.quantity;

        if (!isSufficient) allValid = false;

        itemResults.push({
          supplierProductId: item.supplierProductId,
          available: isSufficient,
          stockQuantity: stockQty,
          requestedQuantity: item.quantity,
          reason: !available
            ? "Product not found or unavailable on CJ Dropshipping"
            : stockQty < item.quantity
            ? `Insufficient stock (${stockQty} available, ${item.quantity} requested)`
            : undefined,
        });
      } catch (err) {
        console.error(
          `[cj-dropshipping] Stock check error for PID ${item.supplierProductId}:`,
          err
        );
        allValid = false;
        itemResults.push({
          supplierProductId: item.supplierProductId,
          available: false,
          stockQuantity: 0,
          requestedQuantity: item.quantity,
          reason: "Unable to query product stock from CJ Dropshipping API",
        });
      }
    }

    return { valid: allValid, itemResults };
  }

  /**
   * Validates if CJ Dropshipping can ship to the specified country/zipcode.
   */
  async validateShippingDestination(
    country: string,
    zipCode?: string
  ): Promise<ShippingValidationResult> {
    if (!this.isConfigured()) {
      return {
        valid: true,
        supported: true,
        estimatedFee: 5.99,
        estimatedDays: "5-12 days",
      };
    }

    try {
      const res = await this.request<CJShippingOption[]>("/logistic/freightCalculate", {
        method: "POST",
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: country,
          zipCode,
        }),
      });

      const options = res.data ?? (Array.isArray(res.result) ? res.result : []);
      if (res.code === 200 && options.length > 0) {
        const topOption = options[0];
        return {
          valid: true,
          supported: true,
          estimatedFee: topOption.logisticPrice,
          estimatedDays: topOption.logisticAging || "7-15 days",
        };
      }

      return {
        valid: false,
        supported: false,
        reason: res.message || `CJ shipping not available for country: ${country}`,
      };
    } catch (err) {
      console.warn("[cj-dropshipping] Destination validation failed:", err);
      return {
        valid: true,
        supported: true,
        estimatedDays: "7-15 days",
      };
    }
  }

  /**
   * Submits an order to CJ Dropshipping for fulfillment.
   */
  async createOrder(params: CreateSupplierOrderParams): Promise<SupplierOrderResult> {
    console.info(`[cj-dropshipping] Creating CJ Order for store order ${params.orderId}...`);

    if (!this.isConfigured()) {
      const mockCjOrderId = `CJ-${Date.now().toString(36).toUpperCase()}`;
      console.info(`[cj-dropshipping] Mock CJ Order Created: ${mockCjOrderId}`);
      return {
        success: true,
        supplierOrderId: mockCjOrderId,
        status: "submitted",
        rawResponse: { mode: "mock", cjOrderId: mockCjOrderId },
      };
    }

    try {
      const payload = {
        orderNumber: params.orderId,
        shippingCustomerName: params.customerName,
        shippingCountryCode: params.shippingAddress.country,
        shippingCountry: params.shippingAddress.country,
        shippingProvince: params.shippingAddress.state,
        shippingCity: params.shippingAddress.city,
        shippingAddress:
          `${params.shippingAddress.address_line1} ${params.shippingAddress.address_line2 || ""}`.trim(),
        shippingZipCode: params.shippingAddress.postal_code,
        shippingPhone: params.customerPhone || "000-000-0000",
        products: params.items.map((item) => ({
          cjProductId: item.supplierProductId,
          vid: item.supplierVariantId || undefined,
          quantity: item.quantity,
        })),
      };

      const res = await this.request<{
        cjOrderId?: string;
        orderId?: string;
      }>("/shopping/order/createOrder", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const dataPayload = res.data ?? (typeof res.result === "object" ? res.result : undefined);

      if (res.code === 200 && (dataPayload?.cjOrderId || dataPayload?.orderId)) {
        const cjId = dataPayload.cjOrderId || dataPayload.orderId!;
        console.info(`[cj-dropshipping] CJ Order successfully created: ${cjId}`);
        return {
          success: true,
          supplierOrderId: cjId,
          status: "submitted",
          rawResponse: dataPayload,
        };
      }

      throw new Error(res.message || "CJ Order creation failed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown order creation failure";
      console.error(`[cj-dropshipping] Create order failed for ${params.orderId}:`, msg);
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Pays a submitted CJ Order using the CJ Account Balance.
   * Endpoint: POST /shopping/pay/payBalance
   * Body: { orderId: string }
   */
  async payOrderWithBalance(cjOrderId: string): Promise<{
    success: boolean;
    message?: string;
    rawResponse?: unknown;
  }> {
    console.info(`[cj-dropshipping] Executing CJ balance payment for CJ Order ${cjOrderId}...`);

    if (!this.isConfigured()) {
      console.info(`[cj-dropshipping] Mock CJ Balance Payment Succeeded for ${cjOrderId}`);
      return {
        success: true,
        message: "Mock balance payment succeeded",
        rawResponse: { mode: "mock", cjOrderId },
      };
    }

    try {
      const res = await this.request<{
        result?: boolean;
        message?: string;
      }>("/shopping/pay/payBalance", {
        method: "POST",
        body: JSON.stringify({ orderId: cjOrderId }),
      });

      const isSuccess = res.code === 200 && (res.result === true || res.result === undefined);

      if (isSuccess) {
        console.info(`[cj-dropshipping] CJ Balance payment successfully executed for CJ Order ${cjOrderId}`);
        return {
          success: true,
          message: res.message || "CJ balance payment completed successfully.",
          rawResponse: res,
        };
      }

      const errMsg = res.message || `CJ balance payment failed with code ${res.code}`;
      console.warn(`[cj-dropshipping] CJ Balance payment rejected for ${cjOrderId}: ${errMsg}`);
      return {
        success: false,
        message: errMsg,
        rawResponse: res,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown CJ balance payment failure";
      console.error(`[cj-dropshipping] CJ Balance payment error for ${cjOrderId}:`, msg);
      return {
        success: false,
        message: msg,
      };
    }
  }

  /**
   * Retrieves tracking details (tracking number, carrier, shipment status) for a CJ Order.
   */
  async getTrackingInfo(cjOrderId: string): Promise<SupplierTrackingInfo> {
    if (!this.isConfigured()) {
      return {
        supplierOrderId: cjOrderId,
        trackingNumber: `CJTRK${Date.now().toString(36).toUpperCase()}`,
        carrier: "CJ Packet Express",
        status: "in_transit",
        shippedAt: new Date().toISOString(),
        rawResponse: { mode: "mock" },
      };
    }

    try {
      const res = await this.request<{
        trackingNumber?: string;
        logisticName?: string;
        logisticStatus?: string;
      }>(`/logistic/getTrackingInfo?orderId=${encodeURIComponent(cjOrderId)}`);

      const dataPayload = res.data ?? (typeof res.result === "object" ? res.result : undefined);

      if (res.code === 200 && dataPayload) {
        return {
          supplierOrderId: cjOrderId,
          trackingNumber: dataPayload.trackingNumber,
          carrier: dataPayload.logisticName || "CJ Packet",
          status: dataPayload.logisticStatus || "shipped",
          rawResponse: dataPayload,
        };
      }

      return {
        supplierOrderId: cjOrderId,
        status: "processing",
      };
    } catch (err) {
      console.error(
        `[cj-dropshipping] Failed to fetch tracking info for ${cjOrderId}:`,
        err
      );
      return {
        supplierOrderId: cjOrderId,
        status: "processing",
      };
    }
  }
}

/** Singleton CJ Dropshipping Service Instance */
export const cjDropshipping = new CJDropshippingService();

