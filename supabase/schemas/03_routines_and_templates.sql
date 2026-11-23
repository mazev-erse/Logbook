-- ============================================================================
-- SCHEMA: 03_routines_and_templates.sql
-- Domain: Workout Routines, Splits & Preset System Templates
-- ============================================================================

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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_routines_user_created ON public.routines (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_seq ON public.routine_exercises (routine_id, sequence_order ASC);

-- ROW LEVEL SECURITY
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

-- Policies: Routines
DROP POLICY IF EXISTS "Users can view system templates or their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can insert their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;

CREATE POLICY "Users can view system templates or their own routines"
  ON public.routines FOR SELECT
  USING (is_system_template = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines"
  ON public.routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON public.routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON public.routines FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: Routine Exercises
DROP POLICY IF EXISTS "Users can view routine exercises for viewable routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can insert exercises to their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can update exercises in their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can delete exercises from their own routines" ON public.routine_exercises;

CREATE POLICY "Users can view routine exercises for viewable routines"
  ON public.routine_exercises FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND (r.is_system_template = true OR r.user_id = auth.uid()))
  );

CREATE POLICY "Users can insert exercises to their own routines"
  ON public.routine_exercises FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Users can update exercises in their own routines"
  ON public.routine_exercises FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Users can delete exercises from their own routines"
  ON public.routine_exercises FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid())
  );

-- SEED PRESET SYSTEM ROUTINES (Push / Pull / Legs)
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
