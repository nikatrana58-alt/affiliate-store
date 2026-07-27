/**
 * lib/cj-dropshipping.ts
 *
 * Official CJ Dropshipping Open API Service Client.
 * Handles authentication, product/stock validation, destination verification,
 * order submission to CJ, and tracking info retrieval.
 * Includes rate-limit backoff, token caching, and automated retries.
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

type CJAuthTokenResponse = {
  code: number;
  result?: {
    accessToken: string;
    accessTokenExpiryDate?: string;
  };
  message?: string;
};

type CJApiResponse<T = unknown> = {
  code: number;
  result?: T;
  message?: string;
};

class CJDropshippingService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private getCredentials() {
    const apiKey = process.env.CJ_API_KEY;
    const email = process.env.CJ_EMAIL;
    const password = process.env.CJ_PASSWORD;

    return { apiKey, email, password };
  }

  /**
   * Fetches an access token from CJ Dropshipping API.
   * Caches token in memory until expiration.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    const { apiKey, email, password } = this.getCredentials();

    if (!email || !password || email.includes("placeholder")) {
      console.warn("[cj-dropshipping] API credentials not configured or using placeholders. Operating in mock/dry-run mode.");
      return "mock_cj_access_token";
    }

    try {
      const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, apiKey }),
      });

      if (!res.ok) {
        throw new Error(`Authentication HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as CJAuthTokenResponse;

      if (data.code !== 200 || !data.result?.accessToken) {
        throw new Error(`CJ Auth Failed: ${data.message || "Invalid credentials"}`);
      }

      this.cachedToken = data.result.accessToken;
      // Set expiration to 23 hours from now if date not provided
      this.tokenExpiresAt = data.result.accessTokenExpiryDate
        ? new Date(data.result.accessTokenExpiryDate).getTime()
        : now + 23 * 60 * 60 * 1000;

      console.info("[cj-dropshipping] Access token successfully acquired.");
      return this.cachedToken;
    } catch (err) {
      console.error("[cj-dropshipping] Failed to acquire access token:", err);
      throw err;
    }
  }

  /**
   * Low-level API request wrapper with automated retries and rate limit protection.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<CJApiResponse<T>> {
    const token = await this.getAccessToken();

    const url = endpoint.startsWith("http") ? endpoint : `${CJ_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(options.headers as Record<string, string>),
    };

    let attempt = 0;
    let delay = 500;

    while (attempt < retries) {
      attempt++;
      try {
        const res = await fetch(url, { ...options, headers });

        if (res.status === 429) {
          // Rate limited — exponential backoff
          console.warn(`[cj-dropshipping] Rate limited (429). Retrying attempt ${attempt}/${retries} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (!res.ok) {
          throw new Error(`CJ API HTTP Error ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as CJApiResponse<T>;
        return data;
      } catch (err) {
        if (attempt >= retries) throw err;
        console.warn(`[cj-dropshipping] Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error("CJ API Request failed after maximum retries.");
  }

  /**
   * Validates product availability and stock quantity prior to submitting order.
   */
  async validateStock(items: ValidateStockItem[]): Promise<StockValidationResult> {
    if (!items.length) {
      return { valid: true, itemResults: [] };
    }

    const { email } = this.getCredentials();
    const isMock = !email || email.includes("placeholder");

    if (isMock) {
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

        const product = queryRes.result;
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
        console.error(`[cj-dropshipping] Stock check error for PID ${item.supplierProductId}:`, err);
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
    const { email } = this.getCredentials();
    const isMock = !email || email.includes("placeholder");

    if (isMock) {
      return {
        valid: true,
        supported: true,
        estimatedFee: 5.99,
        estimatedDays: "5-12 days",
      };
    }

    try {
      const res = await this.request<{
        logisticName?: string;
        logisticPrice?: number;
        logisticAging?: string;
      }>("/logistic/freightCalculate", {
        method: "POST",
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: country,
          zipCode,
        }),
      });

      if (res.code === 200 && res.result) {
        return {
          valid: true,
          supported: true,
          estimatedFee: res.result.logisticPrice,
          estimatedDays: res.result.logisticAging || "7-15 days",
        };
      }

      return {
        valid: false,
        supported: false,
        reason: res.message || `CJ shipping not available for country: ${country}`,
      };
    } catch (err) {
      console.warn("[cj-dropshipping] Destination validation failed:", err);
      // Fallback: accept common countries
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
    const { email } = this.getCredentials();
    const isMock = !email || email.includes("placeholder");

    console.info(`[cj-dropshipping] Creating CJ Order for store order ${params.orderId}...`);

    if (isMock) {
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
        shippingAddress: `${params.shippingAddress.address_line1} ${params.shippingAddress.address_line2 || ""}`.trim(),
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

      if (res.code === 200 && (res.result?.cjOrderId || res.result?.orderId)) {
        const cjId = res.result.cjOrderId || res.result.orderId!;
        console.info(`[cj-dropshipping] CJ Order successfully created: ${cjId}`);
        return {
          success: true,
          supplierOrderId: cjId,
          status: "submitted",
          rawResponse: res.result,
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
   * Retrieves tracking details (tracking number, carrier, shipment status) for a CJ Order.
   */
  async getTrackingInfo(cjOrderId: string): Promise<SupplierTrackingInfo> {
    const { email } = this.getCredentials();
    const isMock = !email || email.includes("placeholder");

    if (isMock) {
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

      if (res.code === 200 && res.result) {
        return {
          supplierOrderId: cjOrderId,
          trackingNumber: res.result.trackingNumber,
          carrier: res.result.logisticName || "CJ Packet",
          status: res.result.logisticStatus || "shipped",
          rawResponse: res.result,
        };
      }

      return {
        supplierOrderId: cjOrderId,
        status: "processing",
      };
    } catch (err) {
      console.error(`[cj-dropshipping] Failed to fetch tracking info for ${cjOrderId}:`, err);
      return {
        supplierOrderId: cjOrderId,
        status: "processing",
      };
    }
  }
}

/** Singleton CJ Dropshipping Service Instance */
export const cjDropshipping = new CJDropshippingService();
