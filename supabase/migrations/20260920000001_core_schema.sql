-- ============================================================================
-- MIGRATION: 20260920000001_core_schema.sql
-- Core Relational Schema, RLS, Initial Seeds, and Storage
-- ============================================================================

-- 1. EXTENSIONS & ENUMS
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

-- 2. CORE TABLES

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

-- WORKOUT SETS (Canonical relational sets table)
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

-- DIET LOGS
CREATE TABLE IF NOT EXISTS public.diet_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
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

-- FITNESS GOALS
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('Bulking', 'Cutting', 'Maintaining')),
  start_weight NUMERIC NOT NULL,
  target_weight NUMERIC NOT NULL,
  target_date DATE NOT NULL,
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
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_exercises_user ON public.exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises (workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON public.workout_sets (workout_exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON public.workout_sets (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_logged ON public.body_metrics (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logs_user_logged ON public.diet_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_logged ON public.supplement_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_created ON public.fitness_goals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_user_created ON public.routines (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_seq ON public.routine_exercises (routine_id, sequence_order ASC);
CREATE INDEX IF NOT EXISTS idx_active_recovery_user_logged ON public.active_recovery_logs (user_id, logged_at DESC);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies: Exercises
DROP POLICY IF EXISTS "Exercises are viewable by everyone if default or owned" ON public.exercises;
DROP POLICY IF EXISTS "Users can create custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;
CREATE POLICY "Exercises are viewable by everyone if default or owned" ON public.exercises FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can create custom exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON public.exercises FOR DELETE USING (auth.uid() = user_id);

-- Policies: Workouts
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
CREATE POLICY "Users can view their own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Policies: Workout Exercises
DROP POLICY IF EXISTS "Users can view workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can create workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can update workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can delete workout exercises for their workouts" ON public.workout_exercises;
CREATE POLICY "Users can view workout exercises for their workouts" ON public.workout_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create workout exercises for their workouts" ON public.workout_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update workout exercises for their workouts" ON public.workout_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete workout exercises for their workouts" ON public.workout_exercises FOR DELETE USING (auth.uid() = user_id);

-- Policies: Workout Sets
DROP POLICY IF EXISTS "Users can view own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.workout_sets;
CREATE POLICY "Users can view own workout sets" ON public.workout_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout sets" ON public.workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout sets" ON public.workout_sets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout sets" ON public.workout_sets FOR DELETE USING (auth.uid() = user_id);

-- Policies: Body Metrics
DROP POLICY IF EXISTS "Users can view their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can create their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can update their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can delete their own body metrics" ON public.body_metrics;
CREATE POLICY "Users can view their own body metrics" ON public.body_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own body metrics" ON public.body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own body metrics" ON public.body_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own body metrics" ON public.body_metrics FOR DELETE USING (auth.uid() = user_id);

-- Policies: Diet Logs
DROP POLICY IF EXISTS "Users can view their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can insert their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can update their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can delete their own diet logs" ON public.diet_logs;
CREATE POLICY "Users can view their own diet logs" ON public.diet_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own diet logs" ON public.diet_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diet logs" ON public.diet_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diet logs" ON public.diet_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies: Supplement Logs
DROP POLICY IF EXISTS "Users can view their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can insert their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can update their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can delete their own supplement logs" ON public.supplement_logs;
CREATE POLICY "Users can view their own supplement logs" ON public.supplement_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplement logs" ON public.supplement_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplement logs" ON public.supplement_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies: Fitness Goals
DROP POLICY IF EXISTS "Users can view their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can insert their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can update their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can delete their own fitness goals" ON public.fitness_goals;
CREATE POLICY "Users can view their own fitness goals" ON public.fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness goals" ON public.fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness goals" ON public.fitness_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness goals" ON public.fitness_goals FOR DELETE USING (auth.uid() = user_id);

-- Policies: Routines
DROP POLICY IF EXISTS "Users can view system templates or their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can insert their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;
CREATE POLICY "Users can view system templates or their own routines" ON public.routines FOR SELECT USING (is_system_template = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- Policies: Routine Exercises
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

-- Policies: Active Recovery
DROP POLICY IF EXISTS "Users can view their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can insert their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can update their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can delete their own active recovery logs" ON public.active_recovery_logs;
CREATE POLICY "Users can view their own active recovery logs" ON public.active_recovery_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own active recovery logs" ON public.active_recovery_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active recovery logs" ON public.active_recovery_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own active recovery logs" ON public.active_recovery_logs FOR DELETE USING (auth.uid() = user_id);

-- 5. AUTH TRIGGER FOR PROFILE CREATION
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

-- 6. CORE SEED EXERCISES
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

-- 7. STORAGE BUCKET: AVATARS
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
