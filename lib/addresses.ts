/**
 * lib/addresses.ts
 *
 * Repository layer for the `addresses` table.
 * All writes use the service-role client (bypasses RLS).
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import type { Address, AddressInput, ADDRESS_COLUMNS } from "@/lib/db/types";
export type { Address, AddressInput } from "@/lib/db/types";

const COLS =
  "id,customer_email,first_name,last_name,address_line1,address_line2," +
  "city,state,postal_code,country,phone,is_default,created_at,updated_at";

// ─── Repository ──────────────────────────────────────────────────────────────

/**
 * Upserts an address record. Matches on exact address content per email.
 * Returns the persisted address.
 */
export async function upsertAddress(input: AddressInput): Promise<Address> {
  const supabase = createAdminSupabaseClient();

  // Check if an identical address already exists for this customer
  const { data: existing } = await supabase
    .from("addresses")
    .select(COLS)
    .eq("customer_email", input.customer_email)
    .eq("address_line1", input.address_line1)
    .eq("city", input.city)
    .eq("postal_code", input.postal_code)
    .maybeSingle();

  if (existing) return existing as unknown as Address;

  const { data, error } = await supabase
    .from("addresses")
    .insert(input)
    .select(COLS)
    .single();

  if (error) throw error;
  return data as unknown as Address;
}

/**
 * Returns all stored addresses for a customer email.
 */
export async function getAddressesByEmail(email: string): Promise<Address[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("addresses")
    .select(COLS)
    .eq("customer_email", email.toLowerCase())
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Address[];
}
