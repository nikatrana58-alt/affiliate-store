/**
 * lib/account.ts
 *
 * Repository functions for Customer Dashboard:
 * - Address Book Management
 * - Wishlist Management
 * - Notification Center
 * - Customer Settings & Preferences
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import type {
  Address,
  AddressInput,
  WishlistItem,
  CustomerNotification,
  CustomerSettings,
} from "@/lib/db/types";
import { getProducts, type Product } from "@/lib/products";

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function getCustomerAddresses(email: string): Promise<Address[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("customer_email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Address[];
}

export async function saveCustomerAddress(
  email: string,
  input: Partial<Address> & { id?: string }
): Promise<Address> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  // If setting default shipping, unset previous default shipping for this email
  if (input.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_email", normalizedEmail);
  }

  // If setting default billing, unset previous default billing
  if (input.is_default_billing) {
    await supabase
      .from("addresses")
      .update({ is_default_billing: false })
      .eq("customer_email", normalizedEmail);
  }

  const payload = {
    customer_email: normalizedEmail,
    first_name: input.first_name ?? "",
    last_name: input.last_name ?? "",
    address_line1: input.address_line1 ?? "",
    address_line2: input.address_line2 ?? null,
    city: input.city ?? "",
    state: input.state ?? "",
    postal_code: input.postal_code ?? "",
    country: input.country ?? "United States",
    phone: input.phone ?? null,
    is_default: Boolean(input.is_default),
    is_default_billing: Boolean(input.is_default_billing),
    address_type: input.address_type ?? "shipping",
  };

  let query;
  if (input.id) {
    query = supabase.from("addresses").update(payload).eq("id", input.id).select().single();
  } else {
    query = supabase.from("addresses").insert(payload).select().single();
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Address;
}

export async function deleteCustomerAddress(id: string, email: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("customer_email", email.toLowerCase().trim());

  if (error) throw error;
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export async function getCustomerWishlist(email: string): Promise<Product[]> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: items, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("customer_email", normalizedEmail);

  if (error) throw error;
  if (!items || items.length === 0) return [];

  const productIds = items.map((i) => i.product_id);
  const allProducts = await getProducts();
  return allProducts.filter((p) => productIds.includes(p.id));
}

export async function addToWishlist(email: string, productId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("wishlists").upsert(
    {
      customer_email: email.toLowerCase().trim(),
      product_id: productId,
    },
    { onConflict: "customer_email,product_id" }
  );

  if (error) throw error;
}

export async function removeFromWishlist(email: string, productId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("customer_email", email.toLowerCase().trim())
    .eq("product_id", productId);

  if (error) throw error;
}

// ─── Notifications Center ───────────────────────────────────────────────────

export async function getCustomerNotifications(email: string): Promise<CustomerNotification[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("customer_notifications")
    .select("*")
    .eq("customer_email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CustomerNotification[];
}

export async function markNotificationAsRead(id: string, email: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("customer_notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("customer_email", email.toLowerCase().trim());

  if (error) throw error;
}

export async function markAllNotificationsAsRead(email: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("customer_notifications")
    .update({ is_read: true })
    .eq("customer_email", email.toLowerCase().trim());

  if (error) throw error;
}

export async function deleteNotification(id: string, email: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("customer_notifications")
    .delete()
    .eq("id", id)
    .eq("customer_email", email.toLowerCase().trim());

  if (error) throw error;
}

// ─── Customer Settings ──────────────────────────────────────────────────────

export async function getCustomerSettings(email: string): Promise<CustomerSettings> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("customer_settings")
    .select("*")
    .eq("customer_email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as unknown as CustomerSettings;

  // Create default settings row if none exists
  const { data: created, error: createErr } = await supabase
    .from("customer_settings")
    .insert({
      customer_email: normalizedEmail,
      email_order_updates: true,
      email_promotions: true,
      sms_updates: false,
      two_factor_enabled: false,
    })
    .select()
    .single();

  if (createErr) throw createErr;
  return created as unknown as CustomerSettings;
}

export async function updateCustomerSettings(
  email: string,
  settings: Partial<CustomerSettings>
): Promise<CustomerSettings> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("customer_settings")
    .upsert(
      {
        customer_email: normalizedEmail,
        ...settings,
      },
      { onConflict: "customer_email" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as unknown as CustomerSettings;
}
