-- ============================================================
-- ReelMind — Migration 003
-- Adds project_tags column to reels table.
-- project_tags = which active projects (EFL, Interlink, etc.)
-- a reel is tagged to. Stored as a text array, no FK constraint
-- because projects are defined client-side in localStorage.
--
-- Run in Supabase → SQL Editor if you already ran 001 + 002.
-- ============================================================

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS project_tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS reels_project_tags_idx ON public.reels USING GIN (project_tags);
