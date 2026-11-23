-- ============================================================================
-- LOGBOOK GYM TRACKER: COMPLETE MASTER SUPABASE SETUP (PRODUCTION READY)
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<your-project-id>/sql
--
-- Includes:
-- 1. Core Schema (profiles, exercises, workouts, workout_exercises, workout_sets, body_metrics)
-- 2. Diet & Nutrition (meal_categories, diet_logs, supplement_logs, bangladeshi_foods)
-- 3. Fitness Goals & Trajectory (fitness_goals with BMR/TDEE support)
-- 4. Routines & Templates (routines, routine_exercises)
-- 5. Sports & Active Recovery (active_recovery_logs with step counter)
-- 6. Sleep Tracker & Recovery (sleep_logs, user_preferences)
-- 7. Gamification & Streaks (badges, user_badges, 36h grace period, exercise_rankings view)
-- 8. Admin Metrics RPC (get_admin_dashboard_data)
-- 9. Complete RLS Policies & Indexes (idempotent DROP/CREATE)
-- 10. Seeds (Exercises, Routine Templates, Gamification Badges, Bangladeshi Foods)
-- 11. Storage (avatars bucket with hardened RLS)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS & ENUMS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE public.exercise_category AS ENUM (
    'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'olympic', 'cardio', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_type AS ENUM (
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'smith_machine', 'band', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop legacy table if present
DROP TABLE IF EXISTS public.sets CASCADE;

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  height NUMERIC(5, 2) DEFAULT 175,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EXERCISES
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.exercise_category NOT NULL DEFAULT 'other',
  equipment public.equipment_type NOT NULL DEFAULT 'other',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKOUTS
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL DEFAULT 'Workout',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKOUT SETS (Canonical table used across the frontend)
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC(3, 1),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BODY METRICS
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  weight NUMERIC(5, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. DIET & NUTRITION TABLES
-- ============================================================================

-- MEAL CATEGORIES
CREATE TABLE IF NOT EXISTS public.meal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Utensils',
  sequence_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DIET LOGS
CREATE TABLE IF NOT EXISTS public.diet_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  category_id UUID REFERENCES public.meal_categories(id) ON DELETE SET NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SUPPLEMENT LOGS
CREATE TABLE IF NOT EXISTS public.supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT false,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BANGLADESHI FOODS
CREATE TABLE IF NOT EXISTS public.bangladeshi_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  search_tags TEXT,
  calories_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  fats_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. GOALS, ROUTINES & RECOVERY
-- ============================================================================

-- FITNESS GOALS
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('Bulking', 'Cutting', 'Maintaining')),
  start_weight NUMERIC NOT NULL,
  target_weight NUMERIC NOT NULL,
  target_date DATE NOT NULL,
  age INT DEFAULT 22,
  biological_sex TEXT DEFAULT 'male',
  height NUMERIC DEFAULT 175,
  activity_level NUMERIC DEFAULT 1.55,
  bmr NUMERIC,
  tdee NUMERIC,
  daily_calorie_goal NUMERIC DEFAULT 2500,
  protein_goal NUMERIC DEFAULT 160,
  carbs_goal NUMERIC DEFAULT 260,
  fats_goal NUMERIC DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROUTINES
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROUTINE EXERCISES
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ACTIVE RECOVERY LOGS
CREATE TABLE IF NOT EXISTS public.active_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  intensity TEXT NOT NULL CHECK (intensity IN ('Low', 'Medium', 'High')),
  calories_burned NUMERIC DEFAULT 0,
  distance_km NUMERIC(6, 2) DEFAULT NULL,
  average_speed_kmh NUMERIC(5, 2) DEFAULT NULL,
  calculated_steps INT DEFAULT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SLEEP LOGS
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bedtime TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  quality TEXT NOT NULL CHECK (quality IN ('Poor', 'Fair', 'Good', 'Excellent')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_bedtime TEXT DEFAULT '22:30',
  sleep_reminder_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 5. GAMIFICATION & BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  tier TEXT NOT NULL DEFAULT 'gold',
  category TEXT NOT NULL DEFAULT 'milestone',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT user_badge_unique UNIQUE (user_id, badge_id)
);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exercises_user ON public.exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises (workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON public.workout_sets (workout_exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON public.workout_sets (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_logged ON public.body_metrics (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_categories_user_order ON public.meal_categories (user_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_diet_logs_user_logged ON public.diet_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logs_category_id ON public.diet_logs (category_id);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_logged ON public.supplement_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_created ON public.fitness_goals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_user_created ON public.routines (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_seq ON public.routine_exercises (routine_id, sequence_order ASC);
CREATE INDEX IF NOT EXISTS idx_active_recovery_user_logged ON public.active_recovery_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_bedtime ON public.sleep_logs(user_id, bedtime DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_slug ON public.badges(slug);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_bangladeshi_foods_name ON public.bangladeshi_foods (food_name);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bangladeshi_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises
DROP POLICY IF EXISTS "Exercises are viewable by everyone if default or owned" ON public.exercises;
DROP POLICY IF EXISTS "Users can create custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;
CREATE POLICY "Exercises are viewable by everyone if default or owned" ON public.exercises FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can create custom exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON public.exercises FOR DELETE USING (auth.uid() = user_id);

-- Workouts
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
CREATE POLICY "Users can view their own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout Exercises
DROP POLICY IF EXISTS "Users can view workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can create workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can update workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can delete workout exercises for their workouts" ON public.workout_exercises;
CREATE POLICY "Users can view workout exercises for their workouts" ON public.workout_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create workout exercises for their workouts" ON public.workout_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update workout exercises for their workouts" ON public.workout_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete workout exercises for their workouts" ON public.workout_exercises FOR DELETE USING (auth.uid() = user_id);

-- Workout Sets
DROP POLICY IF EXISTS "Users can view own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.workout_sets;
CREATE POLICY "Users can view own workout sets" ON public.workout_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout sets" ON public.workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout sets" ON public.workout_sets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout sets" ON public.workout_sets FOR DELETE USING (auth.uid() = user_id);

-- Body Metrics
DROP POLICY IF EXISTS "Users can view their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can create their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can update their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can delete their own body metrics" ON public.body_metrics;
CREATE POLICY "Users can view their own body metrics" ON public.body_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own body metrics" ON public.body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own body metrics" ON public.body_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own body metrics" ON public.body_metrics FOR DELETE USING (auth.uid() = user_id);

-- Meal Categories
DROP POLICY IF EXISTS "Users can view their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can insert their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can update their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can delete their own meal categories" ON public.meal_categories;
CREATE POLICY "Users can view their own meal categories" ON public.meal_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal categories" ON public.meal_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal categories" ON public.meal_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal categories" ON public.meal_categories FOR DELETE USING (auth.uid() = user_id);

-- Diet Logs
DROP POLICY IF EXISTS "Users can view their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can insert their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can update their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can delete their own diet logs" ON public.diet_logs;
CREATE POLICY "Users can view their own diet logs" ON public.diet_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own diet logs" ON public.diet_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diet logs" ON public.diet_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diet logs" ON public.diet_logs FOR DELETE USING (auth.uid() = user_id);

-- Supplement Logs
DROP POLICY IF EXISTS "Users can view their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can insert their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can update their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can delete their own supplement logs" ON public.supplement_logs;
CREATE POLICY "Users can view their own supplement logs" ON public.supplement_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplement logs" ON public.supplement_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplement logs" ON public.supplement_logs FOR DELETE USING (auth.uid() = user_id);

-- Bangladeshi Foods (Read-only for all)
DROP POLICY IF EXISTS "Bangladeshi foods are viewable by everyone" ON public.bangladeshi_foods;
CREATE POLICY "Bangladeshi foods are viewable by everyone" ON public.bangladeshi_foods FOR SELECT USING (true);

-- Fitness Goals
DROP POLICY IF EXISTS "Users can view their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can insert their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can update their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can delete their own fitness goals" ON public.fitness_goals;
CREATE POLICY "Users can view their own fitness goals" ON public.fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness goals" ON public.fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness goals" ON public.fitness_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness goals" ON public.fitness_goals FOR DELETE USING (auth.uid() = user_id);

-- Routines
DROP POLICY IF EXISTS "Users can view system templates or their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can insert their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;
CREATE POLICY "Users can view system templates or their own routines" ON public.routines FOR SELECT USING (is_system_template = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- Routine Exercises
DROP POLICY IF EXISTS "Users can view routine exercises for viewable routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can insert exercises to their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can update exercises in their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can delete exercises from their own routines" ON public.routine_exercises;
CREATE POLICY "Users can view routine exercises for viewable routines" ON public.routine_exercises FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND (r.is_system_template = true OR r.user_id = auth.uid()))
);
CREATE POLICY "Users can insert exercises to their own routines" ON public.routine_exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users can update exercises in their own routines" ON public.routine_exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users can delete exercises from their own routines" ON public.routine_exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
);

-- Active Recovery
DROP POLICY IF EXISTS "Users can view their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can insert their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can update their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can delete their own active recovery logs" ON public.active_recovery_logs;
CREATE POLICY "Users can view their own active recovery logs" ON public.active_recovery_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own active recovery logs" ON public.active_recovery_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active recovery logs" ON public.active_recovery_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own active recovery logs" ON public.active_recovery_logs FOR DELETE USING (auth.uid() = user_id);

-- Sleep Logs
DROP POLICY IF EXISTS "Users can view their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can insert their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can update their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can delete their own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can view their own sleep logs" ON public.sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sleep logs" ON public.sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep logs" ON public.sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sleep logs" ON public.sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- User Preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Badges & User Badges
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.badges;
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own earned badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert their own earned badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can update their own earned badges" ON public.user_badges;
CREATE POLICY "Users can view their own earned badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own earned badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own earned badges" ON public.user_badges FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 8. FUNCTIONS, TRIGGERS & VIEWS
-- ============================================================================

-- Auth Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 36-Hour Grace Period Streak Protection Trigger
CREATE OR REPLACE FUNCTION public.check_workout_grace_period()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  IF NEW.started_at < (NOW() - INTERVAL '36 hours 5 minutes') THEN
    RAISE EXCEPTION 'Grace period expired. This workout can no longer be logged.'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'check_workout_36h_grace_period';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_workout_grace_period ON public.workouts;
CREATE TRIGGER trg_check_workout_grace_period
  BEFORE INSERT OR UPDATE OF started_at ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_workout_grace_period();

-- Exercise Rankings View (Security Invoker)
CREATE OR REPLACE VIEW public.exercise_rankings WITH (security_invoker = true) AS
WITH unified_sets AS (
    SELECT 
        ws.id AS set_id,
        COALESCE(ws.user_id, w.user_id) AS user_id,
        we.exercise_id,
        COALESCE(e.name, 'Exercise') AS exercise_name,
        w.id AS workout_id,
        COALESCE(w.name, 'Workout') AS workout_name,
        COALESCE(ws.completed_at, w.completed_at, w.started_at, w.created_at) AS performed_at,
        ws.weight::numeric AS weight,
        ws.reps::integer AS reps
    FROM public.workout_sets ws
    JOIN public.workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN public.workouts w ON we.workout_id = w.id
    LEFT JOIN public.exercises e ON we.exercise_id = e.id
    WHERE ws.weight > 0 AND ws.reps > 0
)
SELECT 
    set_id,
    user_id,
    exercise_id,
    exercise_name,
    workout_id,
    workout_name,
    performed_at,
    weight,
    reps,
    ROUND((weight * (1.0 + (reps::numeric / 30.0))), 1) AS estimated_1rm,
    DENSE_RANK() OVER (
        PARTITION BY user_id, exercise_id 
        ORDER BY (weight * (1.0 + (reps::numeric / 30.0))) DESC, weight DESC, reps DESC, performed_at DESC
    ) AS performance_rank
FROM unified_sets;

GRANT SELECT ON public.exercise_rankings TO authenticated, anon;

-- Admin Dashboard RPC Function (Protected by Email Check)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  caller_id uuid;
  result json;
BEGIN
  caller_id := auth.uid();
  caller_email := auth.jwt()->>'email';

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Unauthenticated caller.';
  END IF;

  IF caller_email IS NULL OR lower(caller_email) NOT IN (
    'admin@example.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Caller (%) is not authorized as an administrator.', caller_email;
  END IF;

  SELECT json_build_object(
    'total_users', COALESCE((SELECT COUNT(*) FROM auth.users), 0),
    'total_workouts', COALESCE((SELECT COUNT(*) FROM public.workouts), 0),
    'total_diet_logs', COALESCE((SELECT COUNT(*) FROM public.diet_logs), 0),
    'total_recovery_logs', COALESCE((SELECT COUNT(*) FROM public.active_recovery_logs), 0),
    'users', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', u.id,
          'email', u.email,
          'created_at', u.created_at,
          'last_sign_in_at', u.last_sign_in_at,
          'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
          'avatar_url', p.avatar_url,
          'bio', p.bio,
          'height', p.height,
          'workout_count', COALESCE((SELECT COUNT(*) FROM public.workouts w WHERE w.user_id = u.id), 0),
          'diet_count', COALESCE((SELECT COUNT(*) FROM public.diet_logs d WHERE d.user_id = u.id), 0),
          'recovery_count', COALESCE((SELECT COUNT(*) FROM public.active_recovery_logs r WHERE r.user_id = u.id), 0)
        ) ORDER BY u.created_at DESC
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;

-- ============================================================================
-- 9. SEED DATA
-- ============================================================================

-- Exercises
INSERT INTO public.exercises (name, category, equipment) VALUES
  ('Barbell Bench Press', 'chest', 'barbell'),
  ('Incline Dumbbell Press', 'chest', 'dumbbell'),
  ('Cable Chest Fly', 'chest', 'cable'),
  ('Push Up', 'chest', 'bodyweight'),
  ('Barbell Squat', 'legs', 'barbell'),
  ('Leg Press', 'legs', 'machine'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Standing Calf Raise', 'legs', 'machine'),
  ('Deadlift', 'back', 'barbell'),
  ('Barbell Bent-Over Row', 'back', 'barbell'),
  ('Lat Pulldown', 'back', 'cable'),
  ('Seated Cable Row', 'back', 'cable'),
  ('Pull Up', 'back', 'bodyweight'),
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Dumbbell Lateral Raise', 'shoulders', 'dumbbell'),
  ('Face Pull', 'shoulders', 'cable'),
  ('Barbell Bicep Curl', 'arms', 'barbell'),
  ('Dumbbell Hammer Curl', 'arms', 'dumbbell'),
  ('Tricep Rope Pushdown', 'arms', 'cable'),
  ('Skull Crusher', 'arms', 'barbell'),
  ('Hanging Leg Raise', 'core', 'bodyweight'),
  ('Plank', 'core', 'bodyweight')
ON CONFLICT DO NOTHING;

-- Badges
INSERT INTO public.badges (slug, name, description, icon, tier, category) VALUES
('30-day-streak', '30-Day Streak', 'Conquered the gym for 30 consecutive workout days. Elite consistency.', 'flame', 'gold', 'streak'),
('new-pr', 'New PR', 'Surpassed your previous all-time personal record on an exercise. Progressive overload unlocked.', 'trophy', 'gold', 'strength'),
('100kg-club', '100kg Club', 'Pulled 100kg or more on the Deadlift. Welcome to the triple-digit heavy lifters.', 'crown', 'platinum', 'strength'),
('7-day-streak', '7-Day Warrior', 'Crushed workouts for 7 consecutive days without skipping.', 'flame', 'silver', 'streak'),
('first-workout', 'First Step', 'Completed your first recorded workout session.', 'award', 'bronze', 'milestone'),
('tonnage-titan', 'Tonnage Titan', 'Lifted over 10,000kg in cumulative volume in a single session.', 'zap', 'gold', 'volume')
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category;

-- Bangladeshi Foods
INSERT INTO public.bangladeshi_foods (food_name, search_tags, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g) VALUES
('Kacchi Biryani (Mutton)', 'kacchi biryani mutton rice meat', 215, 8.5, 25.0, 9.0),
('Plain White Rice (Bhaat)', 'bhaat rice white boiled plain', 130, 2.7, 28.0, 0.3),
('Beef Bhuna (Curry)', 'beef curry bhuna meat spicy', 250, 20.0, 4.0, 17.0),
('Chicken Roast (Deshi)', 'chicken roast murgi fry sonali', 230, 18.0, 5.0, 15.0),
('Roti (Chapati)', 'roti chapati rooti bread wheat atta', 297, 9.0, 60.0, 2.0),
('Daal (Lentil Soup)', 'daal dal masoor lentil soup', 116, 9.0, 20.0, 0.4),
('Fuchka (Pani Puri)', 'fuchka phuchka pani puri snack', 340, 7.0, 42.0, 16.0),
('Hilsha Fish (Ilish Maas)', 'ilish hilsha fish maas padma', 270, 22.0, 0.0, 20.0),
('Rui Fish Curry', 'rui rohu fish curry maas', 140, 16.0, 4.0, 6.0),
('Mishti Doi (Sweet Yogurt)', 'mishti doi yogurt sweet curd dessert', 150, 4.0, 20.0, 6.0)
ON CONFLICT DO NOTHING;

-- Routine Templates (Push / Pull / Legs)
DO $$
DECLARE
  push_id UUID;
  pull_id UUID;
  legs_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Push Day (Chest / Shoulders / Triceps)' AND is_system_template = true) THEN
    INSERT INTO public.routines (name, description, is_system_template)
    VALUES ('Push Day (Chest / Shoulders / Triceps)', 'Standard hypertrophy chest, shoulder and triceps workout.', true)
    RETURNING id INTO push_id;

    INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps) VALUES
      (push_id, 'Barbell Bench Press', 1, 4, 8),
      (push_id, 'Incline Dumbbell Press', 2, 3, 10),
      (push_id, 'Overhead Press', 3, 3, 8),
      (push_id, 'Dumbbell Lateral Raise', 4, 4, 12),
      (push_id, 'Tricep Rope Pushdown', 5, 3, 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Pull Day (Back / Biceps)' AND is_system_template = true) THEN
    INSERT INTO public.routines (name, description, is_system_template)
    VALUES ('Pull Day (Back / Biceps)', 'Hypertrophy pulling routine targeting lats, upper back, and biceps.', true)
    RETURNING id INTO pull_id;

    INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps) VALUES
      (pull_id, 'Deadlift', 1, 3, 5),
      (pull_id, 'Barbell Bent-Over Row', 2, 4, 8),
      (pull_id, 'Lat Pulldown', 3, 3, 10),
      (pull_id, 'Face Pull', 4, 4, 15),
      (pull_id, 'Barbell Bicep Curl', 5, 3, 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Leg Day (Quads / Hamstrings / Calves)' AND is_system_template = true) THEN
    INSERT INTO public.routines (name, description, is_system_template)
    VALUES ('Leg Day (Quads / Hamstrings / Calves)', 'Lower body routine focusing on squat strength, quad volume, and hamstrings.', true)
    RETURNING id INTO legs_id;

    INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps) VALUES
      (legs_id, 'Barbell Squat', 1, 4, 6),
      (legs_id, 'Romanian Deadlift', 2, 3, 8),
      (legs_id, 'Leg Press', 3, 3, 12),
      (legs_id, 'Standing Calf Raise', 4, 4, 15),
      (legs_id, 'Hanging Leg Raise', 5, 3, 15);
  END IF;
END $$;

-- ============================================================================
-- 10. STORAGE BUCKET & HARDENED RLS POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can view their own avatar files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- 11. SUPABASE REALTIME REPLICATION (CROSS-DEVICE SYNC)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workouts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workout_exercises') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_exercises;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workout_sets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'diet_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'supplement_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supplement_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'routines') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routines;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'routine_exercises') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_exercises;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'body_metrics') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.body_metrics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fitness_goals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fitness_goals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'active_recovery_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_recovery_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sleep_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sleep_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_badges') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
  END IF;
END $$;
