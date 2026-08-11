-- ═════════════════════════════════════════════════════════════════════════════
-- SUPABASE ADDITIVE MIGRATION — ADD VARIANTS & IMAGES TO PUBLIC.PRODUCTS
-- ═════════════════════════════════════════════════════════════════════════════
-- Safe additive migration. Does NOT drop or alter existing columns/data.
-- Executable multiple times safely without error.

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Optional: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
