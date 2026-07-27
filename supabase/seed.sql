-- ============================================================
-- Seed: supabase/seed.sql
-- Test data for development. Run AFTER 001_ecommerce_schema.sql.
-- DO NOT run in production.
-- ============================================================

-- ── Coupons ──────────────────────────────────────────────────

insert into public.coupons
  (code, description, discount_type, discount_value, minimum_order, max_uses, is_active)
values
  (
    'CURATED10',
    '10% off your first order',
    'percentage',
    10,
    0,
    null,   -- unlimited uses
    true
  ),
  (
    'WELCOME20',
    '$20 off orders over $100',
    'fixed',
    20,
    100,
    500,
    true
  ),
  (
    'EXPIRED50',
    '50% off — expired code for testing',
    'percentage',
    50,
    0,
    null,
    false
  )
on conflict (code) do nothing;
