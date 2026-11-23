-- ============================================================================
-- WORKOUT ROUTINES & TEMPLATES SCHEMA & SEED SCRIPT FOR GYM TRACKER PWA
-- ============================================================================

-- 1. Routines Table
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Routine Exercises Table
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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_routines_user_created ON public.routines (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_seq ON public.routine_exercises (routine_id, sequence_order ASC);

-- Enable Row Level Security
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so this script can be re-run safely
DROP POLICY IF EXISTS "Users can view system templates or their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can insert their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;

DROP POLICY IF EXISTS "Users can view routine exercises for viewable routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can insert exercises to their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can update exercises in their own routines" ON public.routine_exercises;
DROP POLICY IF EXISTS "Users can delete exercises from their own routines" ON public.routine_exercises;

-- Routines Policies
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

-- Routine Exercises Policies
CREATE POLICY "Users can view routine exercises for viewable routines"
    ON public.routine_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routines r
            WHERE r.id = routine_exercises.routine_id
            AND (r.is_system_template = true OR r.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert exercises to their own routines"
    ON public.routine_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routines r
            WHERE r.id = routine_exercises.routine_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update exercises in their own routines"
    ON public.routine_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.routines r
            WHERE r.id = routine_exercises.routine_id
            AND r.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routines r
            WHERE r.id = routine_exercises.routine_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete exercises from their own routines"
    ON public.routine_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.routines r
            WHERE r.id = routine_exercises.routine_id
            AND r.user_id = auth.uid()
        )
    );

-- ============================================================================
-- SEED SYSTEM TEMPLATES (Push Day, Pull Day, Leg Day, Upper/Lower Split)
-- ============================================================================

DO $$
DECLARE
    push_id UUID;
    pull_id UUID;
    leg_id UUID;
    upper_id UUID;
BEGIN
    -- 1. Push Day Template
    IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Push Day' AND is_system_template = true) THEN
        INSERT INTO public.routines (id, user_id, name, description, is_system_template)
        VALUES (gen_random_uuid(), NULL, 'Push Day', 'Chest, Shoulders & Triceps hypertrophy focus', true)
        RETURNING id INTO push_id;

        INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps)
        VALUES
            (push_id, 'Barbell Bench Press', 1, 3, 8),
            (push_id, 'Incline Dumbbell Press', 2, 3, 10),
            (push_id, 'Overhead Press', 3, 3, 10),
            (push_id, 'Tricep Rope Pushdown', 4, 3, 12);
    END IF;

    -- 2. Pull Day Template
    IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Pull Day' AND is_system_template = true) THEN
        INSERT INTO public.routines (id, user_id, name, description, is_system_template)
        VALUES (gen_random_uuid(), NULL, 'Pull Day', 'Back, Rear Delts & Biceps strength focus', true)
        RETURNING id INTO pull_id;

        INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps)
        VALUES
            (pull_id, 'Deadlift', 1, 3, 5),
            (pull_id, 'Barbell Bent-Over Row', 2, 3, 8),
            (pull_id, 'Lat Pulldown', 3, 3, 10),
            (pull_id, 'Barbell Bicep Curl', 4, 3, 12);
    END IF;

    -- 3. Leg Day Template
    IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Leg Day' AND is_system_template = true) THEN
        INSERT INTO public.routines (id, user_id, name, description, is_system_template)
        VALUES (gen_random_uuid(), NULL, 'Leg Day', 'Quads, Hamstrings & Calves power foundation', true)
        RETURNING id INTO leg_id;

        INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps)
        VALUES
            (leg_id, 'Barbell Squat', 1, 3, 8),
            (leg_id, 'Romanian Deadlift', 2, 3, 10),
            (leg_id, 'Leg Press', 3, 3, 12),
            (leg_id, 'Standing Calf Raise', 4, 4, 15);
    END IF;

    -- 4. Upper/Lower Split Template
    IF NOT EXISTS (SELECT 1 FROM public.routines WHERE name = 'Upper/Lower Split' AND is_system_template = true) THEN
        INSERT INTO public.routines (id, user_id, name, description, is_system_template)
        VALUES (gen_random_uuid(), NULL, 'Upper/Lower Split', 'Efficient 4-day compound split for overall strength', true)
        RETURNING id INTO upper_id;

        INSERT INTO public.routine_exercises (routine_id, exercise_name, sequence_order, target_sets, target_reps)
        VALUES
            (upper_id, 'Barbell Bench Press', 1, 4, 8),
            (upper_id, 'Barbell Bent-Over Row', 2, 4, 8),
            (upper_id, 'Overhead Press', 3, 3, 10),
            (upper_id, 'Pull Up', 4, 3, 10);
    END IF;
END $$;
