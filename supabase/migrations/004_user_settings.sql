-- User settings table — stores category/project customisations in the DB
-- so they persist across browsers and devices instead of only in localStorage

CREATE TABLE IF NOT EXISTS public.user_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow all operations (single-user app, no auth required)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
