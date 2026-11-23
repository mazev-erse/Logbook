-- ============================================================================
-- SCHEMA: 02_workouts_and_exercises.sql
-- Domain: Core Training Logging (Exercises, Workouts, Exercises in Workout, Sets)
-- ============================================================================

-- ENUMS
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
  mood TEXT,
  session_rpe NUMERIC,
  rating INT,
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

-- WORKOUT SETS (Canonical table for all training sets)
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_exercises_user ON public.exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises (workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON public.workout_sets (workout_exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON public.workout_sets (user_id, is_completed);

-- ROW LEVEL SECURITY
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- Policies: Exercises
DROP POLICY IF EXISTS "Exercises are viewable by everyone if default or owned" ON public.exercises;
DROP POLICY IF EXISTS "Users can create custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;

CREATE POLICY "Exercises are viewable by everyone if default or owned"
  ON public.exercises FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create custom exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: Workouts
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;

CREATE POLICY "Users can view their own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: Workout Exercises
DROP POLICY IF EXISTS "Users can view workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can create workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can update workout exercises for their workouts" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can delete workout exercises for their workouts" ON public.workout_exercises;

CREATE POLICY "Users can view workout exercises for their workouts"
  ON public.workout_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workout exercises for their workouts"
  ON public.workout_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update workout exercises for their workouts"
  ON public.workout_exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete workout exercises for their workouts"
  ON public.workout_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: Workout Sets
DROP POLICY IF EXISTS "Users can view own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.workout_sets;

CREATE POLICY "Users can view own workout sets"
  ON public.workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets"
  ON public.workout_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets"
  ON public.workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- 22 CORE SEED EXERCISES
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
