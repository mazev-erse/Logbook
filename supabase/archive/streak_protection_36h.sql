-- 36-Hour Grace Period & Streak Protection
-- Enforces that workouts cannot be logged more than 36 hours in the past.

CREATE OR REPLACE FUNCTION public.check_workout_grace_period()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  -- Strict 36-hour grace period check (with 5-minute buffer for clock drift)
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
