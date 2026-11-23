-- ============================================================================
-- SPORTS & ACTIVE RECOVERY LOGS SCHEMA & RLS POLICIES FOR GYM TRACKER PWA
-- ============================================================================

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

-- Index for fast user + date queries
CREATE INDEX IF NOT EXISTS idx_active_recovery_user_logged ON public.active_recovery_logs (user_id, logged_at DESC);

-- Enable Row Level Security
ALTER TABLE public.active_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so this script can be re-run safely
DROP POLICY IF EXISTS "Users can view their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can insert their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can update their own active recovery logs" ON public.active_recovery_logs;
DROP POLICY IF EXISTS "Users can delete their own active recovery logs" ON public.active_recovery_logs;

-- 1. Users can view their own active recovery logs
CREATE POLICY "Users can view their own active recovery logs"
    ON public.active_recovery_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Users can insert their own active recovery logs
CREATE POLICY "Users can insert their own active recovery logs"
    ON public.active_recovery_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own active recovery logs
CREATE POLICY "Users can update their own active recovery logs"
    ON public.active_recovery_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own active recovery logs
CREATE POLICY "Users can delete their own active recovery logs"
    ON public.active_recovery_logs FOR DELETE
    USING (auth.uid() = user_id);
