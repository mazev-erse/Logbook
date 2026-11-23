-- ============================================================================
-- DIET LOGS SCHEMA & RLS POLICIES FOR GYM TRACKER PWA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    calories NUMERIC NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fats NUMERIC NOT NULL DEFAULT 0,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user + date queries
CREATE INDEX IF NOT EXISTS idx_diet_logs_user_logged_at ON public.diet_logs (user_id, logged_at DESC);

-- Enable Row Level Security
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so this script can be run repeatedly without error 42710
DROP POLICY IF EXISTS "Users can view their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can insert their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can update their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can delete their own diet logs" ON public.diet_logs;

-- 1. Users can view their own diet logs
CREATE POLICY "Users can view their own diet logs"
    ON public.diet_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Users can insert their own diet logs
CREATE POLICY "Users can insert their own diet logs"
    ON public.diet_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own diet logs
CREATE POLICY "Users can update their own diet logs"
    ON public.diet_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own diet logs
CREATE POLICY "Users can delete their own diet logs"
    ON public.diet_logs FOR DELETE
    USING (auth.uid() = user_id);
