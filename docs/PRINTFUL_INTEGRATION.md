# Printful Integration Architecture & Developer Guide

## Overview

This directory documents the production-grade Printful print-on-demand and fulfillment integration for the Smart Affiliate Landing Store (`affiliate-store`).

The module is strictly server-only, strongly typed, and includes automated retries with exponential backoff, rate limit handling, input validation using Zod, Next.js caching, CDN image optimization, and secure webhook verification.

---

## 1. Environment Configuration

The integration relies on environment variables set in `.env.local`:

```env
# Required for live Printful API communication
PRINTFUL_API_TOKEN=your_private_api_token_here

# Optional: Store ID for multi-store accounts
PRINTFUL_STORE_ID=1234567

# Optional: Webhook HMAC secret for signature verification
PRINTFUL_WEBHOOK_SECRET=your_webhook_secret_here
```

> **Note**: When `PRINTFUL_API_TOKEN` is unconfigured or set to a placeholder, the module automatically enters safe fallback mock mode so operations proceed without breaking.

---

## 2. Directory & Module Structure

All Printful client logic resides in `lib/printful/`:

```
lib/printful/
├── client.ts        # Strongly typed API client with fetch, retries & rate limits
├── config.ts        # Credential validation and env getters
├── constants.ts     # API base URLs, endpoint routes, timeouts, event names
├── errors.ts        # Custom error hierarchy (PrintfulAPIError, PrintfulRateLimitError, etc.)
├── helpers.ts       # Price calculation, currency formatting, CDN image optimizer
├── index.ts         # Module barrel export
├── service.ts       # High-level service layer with caching and DB product syncing
├── types.ts         # Full TypeScript type definitions for Printful entities & APIs
├── validation.ts    # Zod validation schemas for all inputs
└── webhook.ts       # Webhook HMAC verification and event handler dispatch
```

---

## 3. Core API Endpoints

The integration exposes standard App Router API endpoints under `app/api/printful/`:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/printful/store` | `GET` | Retrieve store metadata, credential health, and warehouse info |
| `/api/printful/products` | `GET` | Query catalog or sync products with pagination & search |
| `/api/printful/products` | `POST` | Sync a Printful sync product into the store catalog |
| `/api/printful/product/[id]` | `GET` | Retrieve catalog/sync product details and variants |
| `/api/printful/order` | `POST` | Create a draft or confirmed Printful order (Zod validated) |
| `/api/printful/order` | `GET` | Query Printful order status by ID |
| `/api/printful/mockups` | `POST` | Initiate automated mockup generation task |
| `/api/printful/mockups` | `GET` | Poll status/result of a mockup generation task |
| `/api/printful/shipping` | `POST` | Calculate real-time shipping rate estimates |
| `/api/printful/webhook` | `POST` | Receive and process Printful webhooks securely |

---

## 4. Usage Examples

### Fetch Catalog Products
```ts
import { printfulService } from "@/lib/printful";

const { products, total } = await printfulService.getProducts({
  limit: 10,
  category_id: 2,
});
```

### Sync Product to Database
```ts
import { printfulService } from "@/lib/printful";

const productRecord = await printfulService.syncProduct(7101, 40); // 40% markup
```

### Estimate Shipping Rates
```ts
import { printfulService } from "@/lib/printful";

const rates = await printfulService.estimateShipping({
  recipient: {
    name: "Jane Doe",
    address1: "123 Main St",
    city: "Los Angeles",
    state_code: "CA",
    country_code: "US",
    zip: "90001",
    email: "jane@example.com",
  },
  items: [{ variant_id: 4011, quantity: 1 }],
});
```

---

## 5. Webhook Security

Printful sends webhooks for key order and product lifecycle events. The webhook route at `/api/printful/webhook` verifies requests via HMAC-SHA256 signature using the `x-printful-signature` header:

Supported Events:
- `package_shipped`: Updates local order status to `shipped` and records tracking number/carrier.
- `order_created` / `order_updated`: Logs order state changes.
- `order_failed` / `order_canceled`: Triggers admin alert notifications.
- `product_updated` / `stock_updated`: Handles catalog updates.
