-- ============================================================================
-- SCHEMA: 05_body_metrics_and_goals.sql
-- Domain: Body Composition, Weight Logs, BMR, TDEE, & Calorie/Macro Goals
-- ============================================================================

-- BODY METRICS (Weight history)
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  weight NUMERIC(5, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FITNESS GOALS (Bulking/Cutting targets with dynamic Mifflin-St Jeor metrics)
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('Bulking', 'Cutting', 'Maintaining')),
  start_weight NUMERIC NOT NULL,
  target_weight NUMERIC NOT NULL,
  target_date DATE NOT NULL,
  age INT DEFAULT 22,
  biological_sex TEXT DEFAULT 'male',
  height NUMERIC DEFAULT 175,
  activity_level NUMERIC DEFAULT 1.55,
  bmr NUMERIC,
  tdee NUMERIC,
  daily_calorie_goal NUMERIC DEFAULT 2500,
  protein_goal NUMERIC DEFAULT 160,
  carbs_goal NUMERIC DEFAULT 260,
  fats_goal NUMERIC DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_logged ON public.body_metrics (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_created ON public.fitness_goals (user_id, created_at DESC);

-- ROW LEVEL SECURITY
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;

-- Policies: Body Metrics
DROP POLICY IF EXISTS "Users can view their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can create their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can update their own body metrics" ON public.body_metrics;
DROP POLICY IF EXISTS "Users can delete their own body metrics" ON public.body_metrics;

CREATE POLICY "Users can view their own body metrics"
  ON public.body_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own body metrics"
  ON public.body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own body metrics"
  ON public.body_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own body metrics"
  ON public.body_metrics FOR DELETE USING (auth.uid() = user_id);

-- Policies: Fitness Goals
DROP POLICY IF EXISTS "Users can view their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can insert their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can update their own fitness goals" ON public.fitness_goals;
DROP POLICY IF EXISTS "Users can delete their own fitness goals" ON public.fitness_goals;

CREATE POLICY "Users can view their own fitness goals"
  ON public.fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness goals"
  ON public.fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness goals"
  ON public.fitness_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness goals"
  ON public.fitness_goals FOR DELETE USING (auth.uid() = user_id);
