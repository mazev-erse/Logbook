-- ============================================================================
-- FITNESS GOALS SCHEMA & RLS POLICIES FOR GYM TRACKER PWA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fitness_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('Bulking', 'Cutting', 'Maintaining')),
    start_weight NUMERIC NOT NULL,
    target_weight NUMERIC NOT NULL,
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user + date queries
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_created_at ON public.fitness_goals (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist so this script can be run repeatedly without error 42710
DROP POLICY IF EXISTS "Users can view their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can insert their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can update their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can delete their own fitness goals" ON public.fitness_goals;

-- 1. Users can view their own fitness goals
CREATE POLICY "Users can view their own fitness goals"
    ON public.fitness_goals FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Users can insert their own fitness goals
CREATE POLICY "Users can insert their own fitness goals"
    ON public.fitness_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own fitness goals
CREATE POLICY "Users can update their own fitness goals"
    ON public.fitness_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own fitness goals
CREATE POLICY "Users can delete their own fitness goals"
    ON public.fitness_goals FOR DELETE
    USING (auth.uid() = user_id);
