-- ============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION FOR LIVE SYNC ACROSS DEVICES
-- ============================================================================

DO $$
BEGIN
  -- 1. Workouts & Sets
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workouts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workout_exercises') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_exercises;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workout_sets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sets;
  END IF;

  -- 2. Diet & Nutrition
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'diet_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_logs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'supplement_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supplement_logs;
  END IF;

  -- 3. Routines
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'routines') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routines;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'routine_exercises') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_exercises;
  END IF;

  -- 4. Metrics & Goals
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'body_metrics') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.body_metrics;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fitness_goals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fitness_goals;
  END IF;

  -- 5. Recovery, Sleep & Badges
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
