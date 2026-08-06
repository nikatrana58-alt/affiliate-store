/**
 * lib/sync/types.ts
 *
 * TypeScript interface definitions for Smart Synchronization Engine, Search Filters,
 * Cron Tasks, and Webhook Logging.
 */

import type { Product } from "@/lib/products";

export type SyncMode = "full" | "incremental" | "manual" | "webhook" | "scheduled";
export type SyncStatus = "pending" | "in_progress" | "completed" | "failed";

export interface SyncLogEntry {
  id: string;
  mode: SyncMode;
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  productsProcessed: number;
  productsCreated: number;
  productsUpdated: number;
  productsDeleted: number;
  errors: string[];
  triggerSource: string;
}

export interface WebhookLogEntry {
  id: string;
  event: string;
  receivedAt: string;
  status: "processed" | "failed" | "retrying";
  retryCount: number;
  payload: Record<string, unknown>;
  error?: string;
}

export interface ProductFilterOptions {
  query?: string;
  category?: string;
  collection?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  brand?: string;
  badge?: string;
  inStock?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "popularity" | "title-asc";
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: Array<{ name: string; count: number }>;
  collections: Array<{ name: string; count: number }>;
  availableColors: string[];
  availableSizes: string[];
  priceRange: { min: number; max: number };
}

export interface CategorySummary {
  name: string;
  slug: string;
  count: number;
  image?: string;
}

export interface CollectionSummary {
  name: string;
  slug: string;
  count: number;
  image?: string;
}
