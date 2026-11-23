-- ============================================================================
-- MIGRATION: 20260924000002_custom_meal_categories_and_foods.sql
-- Custom Meal Categories, Nutrition Seeds, Dynamic Goals, and Step Tracking
-- ============================================================================

-- 1. MEAL CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.meal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Utensils',
  sequence_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_categories_user_order ON public.meal_categories (user_id, sequence_order);

ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can insert their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can update their own meal categories" ON public.meal_categories;
DROP POLICY IF EXISTS "Users can delete their own meal categories" ON public.meal_categories;

CREATE POLICY "Users can view their own meal categories"
  ON public.meal_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal categories"
  ON public.meal_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal categories"
  ON public.meal_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal categories"
  ON public.meal_categories FOR DELETE USING (auth.uid() = user_id);

-- 2. DIET LOGS ENHANCEMENTS
ALTER TABLE public.diet_logs
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.meal_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_diet_logs_category_id ON public.diet_logs (category_id);

-- Drop legacy hardcoded check constraint to support custom categories
ALTER TABLE public.diet_logs DROP CONSTRAINT IF EXISTS diet_logs_meal_type_check;

-- 3. BANGLADESHI FOODS SEED TABLE
CREATE TABLE IF NOT EXISTS public.bangladeshi_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  search_tags TEXT,
  calories_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  fats_per_100g NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bangladeshi_foods_name ON public.bangladeshi_foods (food_name);

ALTER TABLE public.bangladeshi_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bangladeshi foods are viewable by everyone" ON public.bangladeshi_foods;
CREATE POLICY "Bangladeshi foods are viewable by everyone"
  ON public.bangladeshi_foods FOR SELECT USING (true);

INSERT INTO public.bangladeshi_foods (food_name, search_tags, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g) VALUES
('Kacchi Biryani (Mutton)', 'kacchi biryani mutton rice meat', 215, 8.5, 25.0, 9.0),
('Plain White Rice (Bhaat)', 'bhaat rice white boiled plain', 130, 2.7, 28.0, 0.3),
('Beef Bhuna (Curry)', 'beef curry bhuna meat spicy', 250, 20.0, 4.0, 17.0),
('Chicken Roast (Deshi)', 'chicken roast murgi fry sonali', 230, 18.0, 5.0, 15.0),
('Roti (Chapati)', 'roti chapati rooti bread wheat atta', 297, 9.0, 60.0, 2.0),
('Daal (Lentil Soup)', 'daal dal masoor lentil soup', 116, 9.0, 20.0, 0.4),
('Fuchka (Pani Puri)', 'fuchka phuchka pani puri snack', 340, 7.0, 42.0, 16.0),
('Hilsha Fish (Ilish Maas)', 'ilish hilsha fish maas padma', 270, 22.0, 0.0, 20.0),
('Rui Fish Curry', 'rui rohu fish curry maas', 140, 16.0, 4.0, 6.0),
('Mishti Doi (Sweet Yogurt)', 'mishti doi yogurt sweet curd dessert', 150, 4.0, 20.0, 6.0)
ON CONFLICT DO NOTHING;

-- 4. DYNAMIC BMR / TDEE FITNESS GOAL COLUMNS
ALTER TABLE public.fitness_goals
  ADD COLUMN IF NOT EXISTS age INT DEFAULT 22,
  ADD COLUMN IF NOT EXISTS biological_sex TEXT DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 175,
  ADD COLUMN IF NOT EXISTS activity_level NUMERIC DEFAULT 1.55,
  ADD COLUMN IF NOT EXISTS bmr NUMERIC,
  ADD COLUMN IF NOT EXISTS tdee NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_calorie_goal NUMERIC DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS protein_goal NUMERIC DEFAULT 160,
  ADD COLUMN IF NOT EXISTS carbs_goal NUMERIC DEFAULT 260,
  ADD COLUMN IF NOT EXISTS fats_goal NUMERIC DEFAULT 70;

-- 5. ACTIVE RECOVERY STEP COUNTING COLUMNS
ALTER TABLE public.active_recovery_logs
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS average_speed_kmh NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calculated_steps INT DEFAULT NULL;
