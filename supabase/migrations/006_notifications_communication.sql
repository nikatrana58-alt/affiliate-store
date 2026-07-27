-- ============================================================
-- Migration: 006_notifications_communication.sql
-- Description: Database tables for Email Logs, Admin Notifications,
--              and Push Notification Subscriptions.
-- ============================================================

-- 1. Email Delivery Logs table
create table if not exists public.email_logs (
  id              uuid         primary key default gen_random_uuid(),
  recipient       text         not null,
  subject         text         not null,
  event_type      text         not null, -- 'order_placed', 'order_shipped', 'payment_failed', etc.
  provider        text         not null default 'smtp',
  status          text         not null default 'queued', -- 'sent' | 'failed' | 'queued'
  error           text,
  retry_count     integer      not null default 0,
  metadata        jsonb,
  created_at      timestamptz  not null default timezone('utc', now()),
  sent_at         timestamptz
);

create index if not exists email_logs_recipient_idx
  on public.email_logs (recipient);

create index if not exists email_logs_status_idx
  on public.email_logs (status);

alter table public.email_logs enable row level security;

-- 2. Admin Notifications table
create table if not exists public.admin_notifications (
  id              uuid         primary key default gen_random_uuid(),
  type            text         not null default 'system', -- 'new_order', 'payment_failed', 'low_inventory', 'cj_failed', 'webhook_failed'
  title           text         not null,
  message         text         not null,
  link            text,
  is_read         boolean      not null default false,
  metadata        jsonb,
  created_at      timestamptz  not null default timezone('utc', now())
);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (is_read)
  where is_read = false;

alter table public.admin_notifications enable row level security;

-- 3. Push Subscriptions Architecture table (Web Push / Mobile Push)
create table if not exists public.push_subscriptions (
  id              uuid         primary key default gen_random_uuid(),
  customer_email  text         not null,
  endpoint        text         not null unique,
  keys_p256dh     text,
  keys_auth       text,
  user_agent      text,
  created_at      timestamptz  not null default timezone('utc', now())
);

create index if not exists push_subscriptions_email_idx
  on public.push_subscriptions (customer_email);

alter table public.push_subscriptions enable row level security;
