-- ============================================================
-- Migration: 007_production_hardening.sql
-- Description: Production database hardening, performance indexes,
--              foreign key constraints, and query tuning.
-- ============================================================

-- 1. Index optimization for orders lookup by customer_email and status
create index if not exists orders_email_status_idx
  on public.orders (customer_email, status, created_at desc);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- 2. Index optimization for order items by order_id and product_id
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

-- 3. Index optimization for payments by gateway_payment_id
create index if not exists payments_gateway_payment_id_idx
  on public.payments (gateway_payment_id);

-- 4. Index optimization for products slug and category
create index if not exists products_slug_idx
  on public.products (slug);

create index if not exists products_category_idx
  on public.products (category);

-- 5. Index optimization for order_status_history
create index if not exists order_status_history_order_id_idx
  on public.order_status_history (order_id, created_at desc);
