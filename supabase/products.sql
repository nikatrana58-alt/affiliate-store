-- Run this in the Supabase SQL editor.
-- Public users may read products. Writes are performed only by the protected
-- Next.js admin API using the server-only Supabase service role key.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  badge text,
  price numeric(12, 2) check (price is null or price >= 0),
  image text,
  affiliate_link text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists products_created_at_idx
  on public.products (created_at desc);

alter table public.products enable row level security;

drop policy if exists "Products are publicly readable" on public.products;

create policy "Products are publicly readable"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Do not add public insert, update, or delete policies. The service role used
-- by the verified admin API bypasses RLS and must never be exposed to clients.
