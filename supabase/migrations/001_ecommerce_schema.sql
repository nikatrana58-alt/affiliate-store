-- ============================================================
-- Migration: 001_ecommerce_schema.sql
-- Description: Production ecommerce tables for Curated Finds.
--
-- SAFE TO RE-RUN: uses IF NOT EXISTS throughout.
-- Preserves: products, product_clicks (untouched).
--
-- Run in Supabase Dashboard → SQL Editor, or via supabase CLI:
--   supabase db push
-- ============================================================

-- Ensure pgcrypto is available (already enabled by products.sql)
create extension if not exists pgcrypto;

-- ============================================================
-- 1. ADDRESSES
--    Reusable shipping/billing address records.
--    Keyed by customer_email since there is no end-user auth.
-- ============================================================

create table if not exists public.addresses (
  id               uuid         primary key default gen_random_uuid(),
  customer_email   text         not null,
  first_name       text         not null,
  last_name        text         not null,
  address_line1    text         not null,
  address_line2    text,
  city             text         not null,
  state            text         not null,
  postal_code      text         not null,
  country          text         not null default 'United States',
  phone            text,
  is_default       boolean      not null default false,
  created_at       timestamptz  not null default timezone('utc', now()),
  updated_at       timestamptz  not null default timezone('utc', now())
);

create index if not exists addresses_customer_email_idx
  on public.addresses (customer_email);

alter table public.addresses enable row level security;

-- Anon cannot read addresses; only service role (admin API) and
-- the owning customer session (future-ready) may access them.
drop policy if exists "Addresses: service role full access" on public.addresses;

-- ============================================================
-- 2. COUPONS
-- ============================================================

create table if not exists public.coupons (
  id               uuid         primary key default gen_random_uuid(),
  code             text         not null unique,
  description      text,
  discount_type    text         not null check (discount_type in ('percentage', 'fixed')),
  discount_value   numeric(10,2) not null check (discount_value > 0),
  minimum_order    numeric(10,2) not null default 0,
  max_uses         integer,                         -- null = unlimited
  uses_count       integer      not null default 0,
  is_active        boolean      not null default true,
  expires_at       timestamptz,
  created_at       timestamptz  not null default timezone('utc', now()),
  updated_at       timestamptz  not null default timezone('utc', now())
);

create index if not exists coupons_code_idx
  on public.coupons (lower(code));

create index if not exists coupons_active_idx
  on public.coupons (is_active) where is_active = true;

alter table public.coupons enable row level security;

-- Coupons are validated server-side; anon cannot enumerate them.
drop policy if exists "Coupons: anon cannot read" on public.coupons;

-- ============================================================
-- 3. ORDERS
-- ============================================================

create table if not exists public.orders (
  id                  uuid         primary key default gen_random_uuid(),

  -- Customer identity (no auth — captured at checkout)
  customer_email      text         not null,
  customer_first_name text         not null,
  customer_last_name  text         not null,
  customer_phone      text,

  -- Address snapshots (denormalized for immutability)
  shipping_address    jsonb        not null,
  billing_address     jsonb,       -- null → same as shipping

  -- Shipping method
  shipping_method     text         not null default 'standard',
  shipping_cost       numeric(10,2) not null default 0,

  -- Financials
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  discount_amount     numeric(10,2) not null default 0,
  tax_amount          numeric(10,2) not null default 0,
  grand_total         numeric(10,2) not null check (grand_total >= 0),

  -- Coupon
  coupon_id           uuid         references public.coupons (id) on delete set null,
  coupon_code         text,        -- snapshot of code used

  -- Status
  status              text         not null default 'pending'
                        check (status in (
                          'pending',
                          'confirmed',
                          'processing',
                          'shipped',
                          'delivered',
                          'cancelled',
                          'refunded'
                        )),

  -- Optional reference to external fulfillment (future use)
  fulfillment_ref     text,
  notes               text,

  created_at          timestamptz  not null default timezone('utc', now()),
  updated_at          timestamptz  not null default timezone('utc', now())
);

create index if not exists orders_customer_email_idx
  on public.orders (customer_email);

create index if not exists orders_status_idx
  on public.orders (status);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Public: no reads. Service role bypasses RLS for all order operations.
-- Future: authenticated customers can read their own orders.
drop policy if exists "Orders: customers read own" on public.orders;

-- ============================================================
-- 4. ORDER ITEMS
-- ============================================================

create table if not exists public.order_items (
  id               uuid         primary key default gen_random_uuid(),
  order_id         uuid         not null
                     references public.orders (id) on delete cascade,

  -- Product reference + snapshot (keeps history if product changes)
  product_id       uuid         not null
                     references public.products (id) on delete restrict,
  product_title    text         not null,    -- snapshot
  product_image    text,                     -- snapshot
  product_slug     text         not null,    -- snapshot

  -- Variant support (future-ready; null = no variant)
  variant_id       uuid,                     -- FK added after product_variants exists

  quantity         integer      not null check (quantity > 0),
  unit_price       numeric(10,2) not null check (unit_price >= 0),
  total_price      numeric(10,2) not null
                     generated always as (quantity * unit_price) stored,

  created_at       timestamptz  not null default timezone('utc', now())
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

alter table public.order_items enable row level security;

-- ============================================================
-- 5. ORDER STATUS HISTORY
--    Append-only audit trail of every status transition.
-- ============================================================

create table if not exists public.order_status_history (
  id          uuid         primary key default gen_random_uuid(),
  order_id    uuid         not null
                references public.orders (id) on delete cascade,
  old_status  text,
  new_status  text         not null,
  note        text,
  changed_by  text         not null default 'system',  -- 'system' | admin email
  created_at  timestamptz  not null default timezone('utc', now())
);

create index if not exists order_status_history_order_id_idx
  on public.order_status_history (order_id);

create index if not exists order_status_history_created_at_idx
  on public.order_status_history (created_at desc);

alter table public.order_status_history enable row level security;

-- ============================================================
-- 6. PAYMENTS
--    One payment record per order. No gateway yet — stores
--    intent/reference for future Stripe/PayPal integration.
-- ============================================================

create table if not exists public.payments (
  id                  uuid         primary key default gen_random_uuid(),
  order_id            uuid         not null unique
                        references public.orders (id) on delete cascade,

  gateway             text         not null default 'manual'
                        check (gateway in ('manual', 'stripe', 'paypal', 'other')),
  gateway_payment_id  text,        -- e.g. Stripe PaymentIntent ID
  gateway_status      text,        -- raw gateway status string
  amount              numeric(10,2) not null,
  currency            text         not null default 'USD',

  status              text         not null default 'pending'
                        check (status in ('pending', 'paid', 'failed', 'refunded')),

  paid_at             timestamptz,
  refunded_at         timestamptz,
  metadata            jsonb,       -- arbitrary gateway payload

  created_at          timestamptz  not null default timezone('utc', now()),
  updated_at          timestamptz  not null default timezone('utc', now())
);

create index if not exists payments_order_id_idx
  on public.payments (order_id);

create index if not exists payments_status_idx
  on public.payments (status);

alter table public.payments enable row level security;

-- ============================================================
-- 7. PRODUCT VARIANTS (future-ready)
--    Size, color, model, etc. Referenced by order_items.
-- ============================================================

create table if not exists public.product_variants (
  id           uuid         primary key default gen_random_uuid(),
  product_id   uuid         not null
                 references public.products (id) on delete cascade,
  name         text         not null,              -- e.g. "Black / Large"
  sku          text         unique,
  price_delta  numeric(10,2) not null default 0,   -- +/- from base price
  is_active    boolean      not null default true,
  sort_order   integer      not null default 0,
  attributes   jsonb,                              -- {"color":"black","size":"L"}
  created_at   timestamptz  not null default timezone('utc', now()),
  updated_at   timestamptz  not null default timezone('utc', now())
);

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

create index if not exists product_variants_sku_idx
  on public.product_variants (sku) where sku is not null;

alter table public.product_variants enable row level security;

-- Variants are public-readable (same as products)
drop policy if exists "Variants: publicly readable" on public.product_variants;
create policy "Variants: publicly readable"
  on public.product_variants
  for select
  to anon, authenticated
  using (true);

-- ============================================================
-- 8. INVENTORY
--    Stock levels per product (and optionally per variant).
--    Negative stock_quantity = oversell protection disabled.
-- ============================================================

create table if not exists public.inventory (
  id                  uuid         primary key default gen_random_uuid(),
  product_id          uuid         not null
                        references public.products (id) on delete cascade,
  variant_id          uuid         references public.product_variants (id) on delete cascade,
  stock_quantity      integer      not null default 0,
  reserved_quantity   integer      not null default 0,  -- held for pending orders
  allow_backorder     boolean      not null default false,
  low_stock_threshold integer      not null default 5,
  updated_at          timestamptz  not null default timezone('utc', now()),

  -- One inventory row per product (or product+variant)
  unique (product_id, variant_id)
);

create index if not exists inventory_product_id_idx
  on public.inventory (product_id);

create index if not exists inventory_variant_id_idx
  on public.inventory (variant_id) where variant_id is not null;

alter table public.inventory enable row level security;

-- Inventory levels are publicly readable (for out-of-stock UI)
drop policy if exists "Inventory: publicly readable" on public.inventory;
create policy "Inventory: publicly readable"
  on public.inventory
  for select
  to anon, authenticated
  using (true);

-- ============================================================
-- 9. updated_at AUTO-UPDATE TRIGGER (shared helper)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Apply trigger to every table that has updated_at

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'addresses', 'coupons', 'orders', 'payments',
    'product_variants', 'inventory'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();',
      tbl, tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- 10. FK: order_items.variant_id → product_variants (deferred)
--     Added here because product_variants now exists.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'order_items_variant_id_fkey'
      and table_name = 'order_items'
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_fkey
      foreign key (variant_id)
      references public.product_variants (id)
      on delete set null;
  end if;
end;
$$;

-- ============================================================
-- DONE — Run supabase/seed.sql next for test data.
-- ============================================================
