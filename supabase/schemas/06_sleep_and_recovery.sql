-- ============================================================================
-- SCHEMA: 06_sleep_and_recovery.sql
-- Domain: Sleep Tracking, Bedtime Reminders & Active Recovery / Step Counting
-- ============================================================================

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

-- USER PREFERENCES (Target bedtime and notification toggles)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_bedtime TEXT DEFAULT '22:30',
  sleep_reminder_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVE RECOVERY LOGS (Sports, Walking, Running with Step Counter metrics)
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_bedtime ON public.sleep_logs (user_id, bedtime DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_active_recovery_user_logged ON public.active_recovery_logs (user_id, logged_at DESC);

-- ROW LEVEL SECURITY
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Sleep Logs
DROP POLICY IF EXISTS "Users can view their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can insert their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can update their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can delete their own sleep logs" ON public.sleep_logs;

CREATE POLICY "Users can view their own sleep logs"
  ON public.sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sleep logs"
  ON public.sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep logs"
  ON public.sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sleep logs"
  ON public.sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies: User Preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Policies: Active Recovery
DROP POLICY IF EXISTS "Users can view their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can insert their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can update their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can delete their own active recovery logs" ON public.active_recovery_logs;

CREATE POLICY "Users can view their own active recovery logs"
  ON public.active_recovery_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own active recovery logs"
  ON public.active_recovery_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active recovery logs"
  ON public.active_recovery_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own active recovery logs"
  ON public.active_recovery_logs FOR DELETE USING (auth.uid() = user_id);
