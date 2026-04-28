-- Add extra_categories column so reels can belong to multiple categories
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS extra_categories text[] DEFAULT '{}';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS reels_extra_categories_gin
  ON public.reels USING GIN (extra_categories);
