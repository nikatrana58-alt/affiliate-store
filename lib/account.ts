/**
 * lib/account.ts
 *
 * Repository functions for Customer Dashboard:
 * - Address Book Management
 * - Wishlist Management
 * - Notification Center
 * - Customer Settings & Preferences
 */

import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
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
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("customer_email", email.toLowerCase().trim())
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as unknown as Address[];
  } catch {
    return [];
  }
}

export async function saveCustomerAddress(
  email: string,
  input: Partial<Address> & { id?: string }
): Promise<Address> {
  const normalizedEmail = email.toLowerCase().trim();
  const fallbackAddress: Address = {
    id: input.id || "addr-" + Date.now(),
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return fallbackAddress;

  try {
    const supabase = createAdminSupabaseClient();

    if (input.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("customer_email", normalizedEmail);
    }

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
    if (error || !data) return fallbackAddress;
    return data as unknown as Address;
  } catch {
    return fallbackAddress;
  }
}

export async function deleteCustomerAddress(id: string, email: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("customer_email", email.toLowerCase().trim());
  } catch {
    // Ignore error in offline/local fallback mode
  }
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export async function getCustomerWishlist(email: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminSupabaseClient();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: items, error } = await supabase
      .from("wishlists")
      .select("product_id")
      .eq("customer_email", normalizedEmail);

    if (error || !items || items.length === 0) return [];

    const productIds = items.map((i) => i.product_id);
    const allProducts = await getProducts();
    return allProducts.filter((p) => productIds.includes(p.id));
  } catch {
    return [];
  }
}

export async function addToWishlist(email: string, productId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from("wishlists").upsert(
      {
        customer_email: email.toLowerCase().trim(),
        product_id: productId,
      },
      { onConflict: "customer_email,product_id" }
    );
  } catch {
    // Ignore error in offline/local fallback mode
  }
}

export async function removeFromWishlist(email: string, productId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("wishlists")
      .delete()
      .eq("customer_email", email.toLowerCase().trim())
      .eq("product_id", productId);
  } catch {
    // Ignore error in offline/local fallback mode
  }
}

// ─── Notifications Center ───────────────────────────────────────────────────

export async function getCustomerNotifications(email: string): Promise<CustomerNotification[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("customer_notifications")
      .select("*")
      .eq("customer_email", email.toLowerCase().trim())
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as unknown as CustomerNotification[];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string, email: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("customer_notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("customer_email", email.toLowerCase().trim());
  } catch {
    // Ignore
  }
}

export async function markAllNotificationsAsRead(email: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("customer_notifications")
      .update({ is_read: true })
      .eq("customer_email", email.toLowerCase().trim());
  } catch {
    // Ignore
  }
}

export async function deleteNotification(id: string, email: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("customer_notifications")
      .delete()
      .eq("id", id)
      .eq("customer_email", email.toLowerCase().trim());
  } catch {
    // Ignore
  }
}

// ─── Customer Settings ──────────────────────────────────────────────────────

export async function getCustomerSettings(email: string): Promise<CustomerSettings> {
  const normalizedEmail = email.toLowerCase().trim();
  const defaultSettings: CustomerSettings = {
    id: "default-settings",
    customer_email: normalizedEmail,
    email_order_updates: true,
    email_promotions: true,
    sms_updates: false,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return defaultSettings;

  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("customer_settings")
      .select("*")
      .eq("customer_email", normalizedEmail)
      .maybeSingle();

    if (error) return defaultSettings;
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

    if (createErr || !created) return defaultSettings;
    return created as unknown as CustomerSettings;
  } catch {
    return defaultSettings;
  }
}

export async function updateCustomerSettings(
  email: string,
  settings: Partial<CustomerSettings>
): Promise<CustomerSettings> {
  const normalizedEmail = email.toLowerCase().trim();
  const fallbackSettings: CustomerSettings = {
    id: "default-settings",
    customer_email: normalizedEmail,
    email_order_updates: settings.email_order_updates ?? true,
    email_promotions: settings.email_promotions ?? true,
    sms_updates: settings.sms_updates ?? false,
    two_factor_enabled: settings.two_factor_enabled ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return fallbackSettings;

  try {
    const supabase = createAdminSupabaseClient();

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

    if (error || !data) return fallbackSettings;
    return data as unknown as CustomerSettings;
  } catch {
    return fallbackSettings;
  }
}
