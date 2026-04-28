-- ============================================================
-- ReelMind — Migration 002
-- Drops the hardcoded category CHECK constraint so that
-- custom categories (stored in localStorage) can be saved to DB.
--
-- Run this in Supabase → SQL Editor if you already ran migration 001.
-- ============================================================

-- Find and drop the category check constraint (it may have an auto-generated name)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.reels'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%productivity%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reels DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No category constraint found — nothing to drop.';
  END IF;
END;
$$;
