-- ============================================================================
-- DYNAMIC BMR, TDEE & CUSTOM MACRO GOALS MIGRATION
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/<your-project-id>/sql
-- ============================================================================

ALTER TABLE public.fitness_goals
ADD COLUMN IF NOT EXISTS age INT DEFAULT 22,
ADD COLUMN IF NOT EXISTS biological_sex TEXT DEFAULT 'male',
ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 175,
ADD COLUMN IF NOT EXISTS activity_level NUMERIC DEFAULT 1.55,
ADD COLUMN IF NOT EXISTS bmr NUMERIC,
ADD COLUMN IF NOT EXISTS tdee NUMERIC,
ADD COLUMN IF NOT EXISTS daily_calorie_goal NUMERIC DEFAULT 2500,
ADD COLUMN IF NOT EXISTS protein_goal NUMERIC DEFAULT 160,
ADD COLUMN IF NOT EXISTS carbs_goal NUMERIC DEFAULT 260,
ADD COLUMN IF NOT EXISTS fats_goal NUMERIC DEFAULT 70;

-- Refresh schema cache notification
NOTIFY pgrst, 'reload schema';
