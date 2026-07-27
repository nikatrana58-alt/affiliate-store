/**
 * lib/inventory.ts
 *
 * Repository layer for the `inventory` and `product_variants` tables.
 * All writes use the service-role client.
 */

import { createAdminSupabaseClient, createPublicSupabaseClient } from "@/lib/supabase";
import type {
  Inventory,
  InventoryWithStatus,
  InventoryStatus,
  ProductVariant,
} from "@/lib/db/types";
export type { Inventory, InventoryWithStatus, InventoryStatus, ProductVariant } from "@/lib/db/types";

const INVENTORY_COLS =
  "id,product_id,variant_id,stock_quantity,reserved_quantity," +
  "allow_backorder,low_stock_threshold,updated_at";

const VARIANT_COLS =
  "id,product_id,name,sku,price_delta,is_active,sort_order,attributes," +
  "created_at,updated_at";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeInventoryStatus(inv: Inventory): InventoryWithStatus {
  const available = inv.stock_quantity - inv.reserved_quantity;
  let status: InventoryStatus;

  if (available <= 0 && !inv.allow_backorder) {
    status = "out_of_stock";
  } else if (available <= inv.low_stock_threshold) {
    status = "low_stock";
  } else {
    status = "in_stock";
  }

  return { ...inv, available_quantity: available, status };
}

// ─── Inventory Repository ────────────────────────────────────────────────────

/**
 * Returns inventory (with computed status) for a product.
 * Uses the anon client — inventory levels are publicly readable.
 */
export async function getInventory(
  productId: string,
  variantId?: string | null
): Promise<InventoryWithStatus | null> {
  const supabase = createPublicSupabaseClient();

  let query = supabase
    .from("inventory")
    .select(INVENTORY_COLS)
    .eq("product_id", productId);

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return computeInventoryStatus(data as unknown as Inventory);
}

/**
 * Returns inventory for multiple products in one query.
 */
export async function getInventoryBatch(
  productIds: string[]
): Promise<Record<string, InventoryWithStatus>> {
  if (!productIds.length) return {};

  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("inventory")
    .select(INVENTORY_COLS)
    .in("product_id", productIds)
    .is("variant_id", null);

  if (error) throw error;

  const result: Record<string, InventoryWithStatus> = {};
  for (const row of data ?? []) {
    const inv = row as unknown as Inventory;
    result[inv.product_id] = computeInventoryStatus(inv);
  }
  return result;
}

/**
 * Sets the stock level for a product (admin use only).
 */
export async function setStockQuantity(
  productId: string,
  quantity: number,
  variantId?: string | null
): Promise<Inventory> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("inventory")
    .upsert(
      {
        product_id: productId,
        variant_id: variantId ?? null,
        stock_quantity: Math.max(0, quantity),
      },
      { onConflict: "product_id,variant_id" }
    )
    .select(INVENTORY_COLS)
    .single();

  if (error) throw error;
  return data as unknown as Inventory;
}

/**
 * Reserves (increments reserved_quantity) for pending orders.
 * Returns false if insufficient stock and backorder not allowed.
 */
export async function reserveStock(
  productId: string,
  quantity: number,
  variantId?: string | null
): Promise<boolean> {
  const supabase = createAdminSupabaseClient();

  const inv = await getInventory(productId, variantId);

  // No inventory record → treated as untracked / always available
  if (!inv) return true;

  if (!inv.allow_backorder && inv.available_quantity < quantity) {
    return false;
  }

  const { error } = await supabase
    .from("inventory")
    .update({
      reserved_quantity: inv.reserved_quantity + quantity,
    })
    .eq("id", inv.id);

  if (error) throw error;
  return true;
}

/**
 * Commits reserved stock → decrements both stock_quantity and reserved_quantity.
 * Called when an order is confirmed/shipped.
 */
export async function commitStock(
  productId: string,
  quantity: number,
  variantId?: string | null
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const inv = await getInventory(productId, variantId);
  if (!inv) return; // untracked

  await supabase
    .from("inventory")
    .update({
      stock_quantity: Math.max(0, inv.stock_quantity - quantity),
      reserved_quantity: Math.max(0, inv.reserved_quantity - quantity),
    })
    .eq("id", inv.id);
}

// ─── Variants Repository ─────────────────────────────────────────────────────

/**
 * Returns all active variants for a product, ordered by sort_order.
 */
export async function getVariantsByProduct(
  productId: string
): Promise<ProductVariant[]> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(VARIANT_COLS)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProductVariant[];
}
