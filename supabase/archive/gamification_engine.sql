-- ==============================================================================
-- MILESTONE & GAMIFICATION ENGINE: SCHEMAS, TABLES, VIEWS & SEED DATA
-- ==============================================================================

-- 1. Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'trophy',
    tier TEXT NOT NULL DEFAULT 'gold', -- 'bronze', 'silver', 'gold', 'platinum'
    category TEXT NOT NULL DEFAULT 'milestone', -- 'streak', 'strength', 'milestone', 'volume'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create user_badges table (many-to-many achievements record)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT user_badge_unique UNIQUE (user_id, badge_id)
);

-- 3. Create indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_badges_slug ON public.badges(slug);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Badges
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.badges;
CREATE POLICY "Badges are viewable by everyone"
    ON public.badges FOR SELECT
    USING (true);

-- 6. RLS Policies for User Badges
DROP POLICY IF EXISTS "Users can view their own earned badges" ON public.user_badges;
CREATE POLICY "Users can view their own earned badges"
    ON public.user_badges FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own earned badges" ON public.user_badges;
CREATE POLICY "Users can insert their own earned badges"
    ON public.user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own earned badges" ON public.user_badges;
CREATE POLICY "Users can update their own earned badges"
    ON public.user_badges FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. Seed Initial Core Badges
INSERT INTO public.badges (slug, name, description, icon, tier, category) VALUES
(
    '30-day-streak',
    '30-Day Streak',
    'Conquered the gym for 30 consecutive workout days. Elite consistency.',
    'flame',
    'gold',
    'streak'
),
(
    'new-pr',
    'New PR',
    'Surpassed your previous all-time personal record on an exercise. Progressive overload unlocked.',
    'trophy',
    'gold',
    'strength'
),
(
    '100kg-club',
    '100kg Club',
    'Pulled 100kg or more on the Deadlift. Welcome to the triple-digit heavy lifters.',
    'crown',
    'platinum',
    'strength'
),
(
    '7-day-streak',
    '7-Day Warrior',
    'Crushed workouts for 7 consecutive days without skipping.',
    'flame',
    'silver',
    'streak'
),
(
    'first-workout',
    'First Step',
    'Completed your first recorded workout session.',
    'award',
    'bronze',
    'milestone'
),
(
    'tonnage-titan',
    'Tonnage Titan',
    'Lifted over 10,000kg in cumulative volume in a single session.',
    'zap',
    'gold',
    'volume'
)
ON CONFLICT (slug) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    tier = EXCLUDED.tier,
    category = EXCLUDED.category;

-- 8. Create exercise_rankings SQL View
-- Calculates estimated 1RM (Epley formula: weight * (1 + reps/30.0)) and ranks user performances per exercise
CREATE OR REPLACE VIEW public.exercise_rankings WITH (security_invoker = true) AS
WITH unified_sets AS (
    SELECT 
        ws.id AS set_id,
        COALESCE(ws.user_id, w.user_id) AS user_id,
        we.exercise_id,
        COALESCE(e.name, 'Exercise') AS exercise_name,
        w.id AS workout_id,
        COALESCE(w.name, 'Workout') AS workout_name,
        COALESCE(ws.completed_at, w.completed_at, w.started_at, w.created_at) AS performed_at,
        ws.weight::numeric AS weight,
        ws.reps::integer AS reps
    FROM public.workout_sets ws
    JOIN public.workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN public.workouts w ON we.workout_id = w.id
    LEFT JOIN public.exercises e ON we.exercise_id = e.id
    WHERE ws.weight > 0 AND ws.reps > 0
)
SELECT 
    set_id,
    user_id,
    exercise_id,
    exercise_name,
    workout_id,
    workout_name,
    performed_at,
    weight,
    reps,
    ROUND((weight * (1.0 + (reps::numeric / 30.0))), 1) AS estimated_1rm,
    DENSE_RANK() OVER (
        PARTITION BY user_id, exercise_id 
        ORDER BY (weight * (1.0 + (reps::numeric / 30.0))) DESC, weight DESC, reps DESC, performed_at DESC
    ) AS performance_rank
FROM unified_sets;

-- 9. Grant read permissions on exercise_rankings view
GRANT SELECT ON public.exercise_rankings TO authenticated, anon;
