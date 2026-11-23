-- ==============================================================================
-- SLEEP TRACKER & RECOVERY REMINDER: SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Create sleep_logs table
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

-- 2. Create user_preferences table (bedtime reminders and recovery goals)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_bedtime TEXT DEFAULT '22:30',
    sleep_reminder_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_bedtime 
    ON public.sleep_logs(user_id, bedtime DESC);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON public.user_preferences(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sleep_logs
DROP POLICY IF EXISTS "Users can view their own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can view their own sleep logs"
    ON public.sleep_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can insert their own sleep logs"
    ON public.sleep_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can update their own sleep logs"
    ON public.sleep_logs FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can delete their own sleep logs"
    ON public.sleep_logs FOR DELETE
    USING (auth.uid() = user_id);

-- 6. RLS Policies for user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);
