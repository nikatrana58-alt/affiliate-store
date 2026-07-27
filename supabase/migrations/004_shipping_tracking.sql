-- ============================================================
-- Migration: 004_shipping_tracking.sql
-- Description: Add detailed shipment tracking fields to orders table.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'estimated_delivery'
  ) then
    alter table public.orders add column estimated_delivery timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'shipped_at'
  ) then
    alter table public.orders add column shipped_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'delivered_at'
  ) then
    alter table public.orders add column delivered_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'last_tracking_sync'
  ) then
    alter table public.orders add column last_tracking_sync timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'tracking_url'
  ) then
    alter table public.orders add column tracking_url text;
  end if;
end;
$$;

create index if not exists orders_tracking_number_idx
  on public.orders (tracking_number)
  where tracking_number is not null;
