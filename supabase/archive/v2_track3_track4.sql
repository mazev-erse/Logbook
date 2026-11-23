-- ============================================================================
-- V2 TRACK 3 & TRACK 4 MIGRATION: WORKOUT MOOD, SESSION RPE & RATINGS
-- Run this in your Supabase SQL Editor to enable workout debrief & notes
-- ============================================================================

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS session_rpe NUMERIC;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS rating INT;
