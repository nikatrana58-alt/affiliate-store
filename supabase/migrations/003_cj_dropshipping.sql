-- ============================================================
-- Migration: 003_cj_dropshipping.sql
-- Description: Add CJ Dropshipping columns for products, orders,
--              variants, and shipping tracking information.
-- ============================================================

-- 1. Add cj_product_id to products table
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'cj_product_id'
  ) then
    alter table public.products add column cj_product_id text;
  end if;
end;
$$;

create index if not exists products_cj_product_id_idx
  on public.products (cj_product_id)
  where cj_product_id is not null;

-- 2. Add cj_variant_id to product_variants table
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'cj_variant_id'
  ) then
    alter table public.product_variants add column cj_variant_id text;
  end if;
end;
$$;

-- 3. Add CJ Dropshipping & Fulfillment fields to orders table
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'cj_order_id'
  ) then
    alter table public.orders add column cj_order_id text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'tracking_number'
  ) then
    alter table public.orders add column tracking_number text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'shipping_carrier'
  ) then
    alter table public.orders add column shipping_carrier text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'fulfillment_status'
  ) then
    alter table public.orders add column fulfillment_status text not null default 'unfulfilled';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'synced_at'
  ) then
    alter table public.orders add column synced_at timestamptz;
  end if;
end;
$$;

create index if not exists orders_cj_order_id_idx
  on public.orders (cj_order_id)
  where cj_order_id is not null;

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status);
