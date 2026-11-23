-- ============================================================================
-- MIGRATION: 20261101000005_drop_legacy_sets_table.sql
-- Safely drop unused legacy public.sets table to standardize on public.workout_sets
-- ============================================================================

DO $$
BEGIN
  -- Only drop if the legacy table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sets'
  ) THEN
    -- Check if any orphan records exist; if any, copy to workout_sets before dropping
    IF EXISTS (SELECT 1 FROM public.sets LIMIT 1) THEN
      INSERT INTO public.workout_sets (id, workout_exercise_id, workout_id, user_id, set_number, weight, reps, rpe, is_completed, created_at)
      SELECT 
        s.id,
        s.workout_exercise_id,
        we.workout_id,
        w.user_id,
        s.set_number,
        s.weight,
        s.reps,
        s.rpe,
        s.is_completed,
        s.created_at
      FROM public.sets s
      JOIN public.workout_exercises we ON s.workout_exercise_id = we.id
      JOIN public.workouts w ON we.workout_id = w.id
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Drop legacy table and any residual policies
    DROP TABLE public.sets CASCADE;
  END IF;
END $$;
