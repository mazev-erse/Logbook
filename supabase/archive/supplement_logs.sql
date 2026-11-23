-- ============================================================================
-- SUPPLEMENT LOGS SCHEMA & RLS POLICIES FOR GYM TRACKER PWA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplement_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    taken BOOLEAN NOT NULL DEFAULT false,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user + date queries
CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_logged_at ON public.supplement_logs (user_id, logged_at DESC);

-- Enable Row Level Security
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so this script can be run repeatedly without error 42710
DROP POLICY IF EXISTS "Users can view their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can insert their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can update their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can delete their own supplement logs" ON public.supplement_logs;

-- 1. Users can view their own supplement logs
CREATE POLICY "Users can view their own supplement logs"
    ON public.supplement_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Users can insert their own supplement logs
CREATE POLICY "Users can insert their own supplement logs"
    ON public.supplement_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own supplement logs
CREATE POLICY "Users can update their own supplement logs"
    ON public.supplement_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own supplement logs
CREATE POLICY "Users can delete their own supplement logs"
    ON public.supplement_logs FOR DELETE
    USING (auth.uid() = user_id);
