-- ============================================================
-- Migration: 002_stripe_columns.sql
-- Description: Add Stripe checkout session tracking, customer mapping,
--              idempotent event logging, and status constraint updates.
-- ============================================================

-- 1. Add stripe_session_id column to orders table if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'stripe_session_id'
  ) then
    alter table public.orders add column stripe_session_id text;
  end if;
end;
$$;

create index if not exists orders_stripe_session_id_idx
  on public.orders (stripe_session_id)
  where stripe_session_id is not null;

-- 2. Stripe Customers table (maps customer_email -> stripe_customer_id)
create table if not exists public.stripe_customers (
  id                 uuid         primary key default gen_random_uuid(),
  customer_email     text         not null unique,
  stripe_customer_id text         not null unique,
  created_at         timestamptz  not null default timezone('utc', now()),
  updated_at         timestamptz  not null default timezone('utc', now())
);

create index if not exists stripe_customers_email_idx
  on public.stripe_customers (customer_email);

alter table public.stripe_customers enable row level security;

-- 3. Stripe Events table for Webhook Idempotency
create table if not exists public.stripe_events (
  id                 text         primary key, -- Stripe Event ID (e.g. evt_1N...)
  type               text         not null,
  processed_at       timestamptz  not null default timezone('utc', now())
);

alter table public.stripe_events enable row level security;

-- 4. Update status check constraints for orders & payments
do $$
begin
  -- Drop existing orders status constraint
  alter table public.orders drop constraint if exists orders_status_check;
  -- Re-add expanded orders status constraint
  alter table public.orders add constraint orders_status_check
    check (status in (
      'pending',
      'paid',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'failed'
    ));

  -- Drop existing payments status constraint
  alter table public.payments drop constraint if exists payments_status_check;
  -- Re-add expanded payments status constraint
  alter table public.payments add constraint payments_status_check
    check (status in (
      'pending',
      'succeeded',
      'paid',
      'failed',
      'refunded',
      'partially_refunded'
    ));
end;
$$;
