-- ============================================================
-- Migration: 005_customer_dashboard.sql
-- Description: Tables for Wishlist, Notifications Center, Customer Settings,
--              and Address Type extensions for the Customer Dashboard.
-- ============================================================

-- 1. Extend addresses table with address_type (shipping/billing/both) & is_default_billing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'addresses'
      and column_name = 'address_type'
  ) then
    alter table public.addresses add column address_type text not null default 'shipping';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'addresses'
      and column_name = 'is_default_billing'
  ) then
    alter table public.addresses add column is_default_billing boolean not null default false;
  end if;
end;
$$;

-- 2. Wishlist table (customer_email -> product_id)
create table if not exists public.wishlists (
  id              uuid         primary key default gen_random_uuid(),
  customer_email  text         not null,
  product_id      uuid         not null references public.products (id) on delete cascade,
  created_at      timestamptz  not null default timezone('utc', now()),

  unique (customer_email, product_id)
);

create index if not exists wishlists_customer_email_idx
  on public.wishlists (customer_email);

alter table public.wishlists enable row level security;

-- 3. Customer Notifications table
create table if not exists public.customer_notifications (
  id              uuid         primary key default gen_random_uuid(),
  customer_email  text         not null,
  type            text         not null default 'order_update', -- 'order_update' | 'shipping' | 'promo' | 'system'
  title           text         not null,
  message         text         not null,
  link            text,
  is_read         boolean      not null default false,
  created_at      timestamptz  not null default timezone('utc', now())
);

create index if not exists customer_notifications_email_idx
  on public.customer_notifications (customer_email);

create index if not exists customer_notifications_unread_idx
  on public.customer_notifications (customer_email, is_read)
  where is_read = false;

alter table public.customer_notifications enable row level security;

-- 4. Customer Settings table (Preferences, 2FA, Security)
create table if not exists public.customer_settings (
  id                     uuid         primary key default gen_random_uuid(),
  customer_email         text         not null unique,
  email_order_updates    boolean      not null default true,
  email_promotions       boolean      not null default true,
  sms_updates            boolean      not null default false,
  two_factor_enabled     boolean      not null default false,
  two_factor_secret      text,
  avatar_url             text,
  phone                  text,
  created_at             timestamptz  not null default timezone('utc', now()),
  updated_at             timestamptz  not null default timezone('utc', now())
);

create index if not exists customer_settings_email_idx
  on public.customer_settings (customer_email);

alter table public.customer_settings enable row level security;
