-- ============================================================================
-- SCHEMA: 04_nutrition_and_diet.sql
-- Domain: Diet Tracking, Custom Categories, Supplements & Nutrition References
-- ============================================================================

-- MEAL CATEGORIES
CREATE TABLE IF NOT EXISTS public.meal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Utensils',
  sequence_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DIET LOGS
CREATE TABLE IF NOT EXISTS public.diet_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  category_id UUID REFERENCES public.meal_categories(id) ON DELETE SET NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drop legacy check constraint if exists to support custom meal categories
ALTER TABLE public.diet_logs DROP CONSTRAINT IF EXISTS diet_logs_meal_type_check;

-- SUPPLEMENT LOGS
CREATE TABLE IF NOT EXISTS public.supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT false,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BANGLADESHI FOODS (Local Nutrition Reference Database)
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_meal_categories_user_order ON public.meal_categories (user_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_diet_logs_user_logged ON public.diet_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logs_category_id ON public.diet_logs (category_id);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_logged ON public.supplement_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_bangladeshi_foods_name ON public.bangladeshi_foods (food_name);

-- ROW LEVEL SECURITY
ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bangladeshi_foods ENABLE ROW LEVEL SECURITY;

-- Policies: Meal Categories
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

-- Policies: Diet Logs
DROP POLICY IF EXISTS "Users can view their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can insert their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can update their own diet logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Users can delete their own diet logs" ON public.diet_logs;

CREATE POLICY "Users can view their own diet logs"
  ON public.diet_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own diet logs"
  ON public.diet_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diet logs"
  ON public.diet_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diet logs"
  ON public.diet_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies: Supplement Logs
DROP POLICY IF EXISTS "Users can view their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can insert their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can update their own supplement logs" ON public.supplement_logs;
DROP POLICY IF EXISTS "Users can delete their own supplement logs" ON public.supplement_logs;

CREATE POLICY "Users can view their own supplement logs"
  ON public.supplement_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own supplement logs"
  ON public.supplement_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplement logs"
  ON public.supplement_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplement logs"
  ON public.supplement_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies: Bangladeshi Foods (Read-Only Catalog for All)
DROP POLICY IF EXISTS "Bangladeshi foods are viewable by everyone" ON public.bangladeshi_foods;
CREATE POLICY "Bangladeshi foods are viewable by everyone"
  ON public.bangladeshi_foods FOR SELECT USING (true);

-- SEED BANGLADESHI FOODS
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
