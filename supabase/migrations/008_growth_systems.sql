-- ============================================================
-- Migration: 008_growth_systems.sql
-- Description: Database tables for Reviews, Gift Cards, Referrals,
--              Loyalty Points, and Abandoned Cart Recovery.
-- ============================================================

-- 1. Product Reviews & Ratings
create table if not exists public.product_reviews (
  id              uuid         primary key default gen_random_uuid(),
  product_id      uuid         not null references public.products (id) on delete cascade,
  customer_email  text         not null,
  customer_name   text         not null,
  rating          integer      not null check (rating >= 1 and rating <= 5),
  title           text         not null,
  comment         text         not null,
  is_verified     boolean      not null default false,
  is_approved     boolean      not null default true,
  helpful_votes   integer      not null default 0,
  created_at      timestamptz  not null default timezone('utc', now())
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id, is_approved);

alter table public.product_reviews enable row level security;

-- 2. Gift Cards (Purchase, Redeem, Balance)
create table if not exists public.gift_cards (
  id              uuid           primary key default gen_random_uuid(),
  code            text           not null unique,
  initial_value   numeric(10,2)  not null,
  current_balance numeric(10,2)  not null,
  purchaser_email text           not null,
  recipient_email text,
  is_active       boolean        not null default true,
  expires_at      timestamptz,
  created_at      timestamptz    not null default timezone('utc', now())
);

create index if not exists gift_cards_code_idx
  on public.gift_cards (code);

alter table public.gift_cards enable row level security;

-- 3. Referral System (Links, Rewards, Tracking)
create table if not exists public.referrals (
  id              uuid         primary key default gen_random_uuid(),
  referrer_email  text         not null,
  referral_code   text         not null unique,
  referred_email  text,
  status          text         not null default 'pending', -- 'pending' | 'completed' | 'rewarded'
  reward_amount   numeric(10,2) not null default 10.00,
  created_at      timestamptz  not null default timezone('utc', now()),
  completed_at    timestamptz
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_email);

create index if not exists referrals_code_idx
  on public.referrals (referral_code);

alter table public.referrals enable row level security;

-- 4. Loyalty Program & VIP Tiers
create table if not exists public.loyalty_accounts (
  id              uuid         primary key default gen_random_uuid(),
  customer_email  text         not null unique,
  points_balance  integer      not null default 0,
  lifetime_points integer      not null default 0,
  vip_tier        text         not null default 'Silver', -- 'Silver' | 'Gold' | 'Platinum'
  created_at      timestamptz  not null default timezone('utc', now()),
  updated_at      timestamptz  not null default timezone('utc', now())
);

create index if not exists loyalty_email_idx
  on public.loyalty_accounts (customer_email);

alter table public.loyalty_accounts enable row level security;

-- 5. Abandoned Carts Recovery
create table if not exists public.abandoned_carts (
  id               uuid         primary key default gen_random_uuid(),
  customer_email   text         not null,
  cart_items       jsonb        not null,
  subtotal         numeric(10,2) not null,
  recovery_token   text         not null unique,
  reminder_sent    boolean      not null default false,
  recovered        boolean      not null default false,
  created_at       timestamptz  not null default timezone('utc', now()),
  recovered_at     timestamptz
);

create index if not exists abandoned_carts_email_idx
  on public.abandoned_carts (customer_email);

create index if not exists abandoned_carts_pending_idx
  on public.abandoned_carts (reminder_sent, recovered)
  where reminder_sent = false and recovered = false;

alter table public.abandoned_carts enable row level security;
