-- ============================================================================
-- CUSTOM MEAL CATEGORIES MIGRATION
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/<your-project-id>/sql
-- ============================================================================

-- 1. Create public.meal_categories table
CREATE TABLE IF NOT EXISTS public.meal_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Utensils',
    sequence_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own meal categories" ON public.meal_categories;
CREATE POLICY "Users can view their own meal categories"
    ON public.meal_categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own meal categories" ON public.meal_categories;
CREATE POLICY "Users can insert their own meal categories"
    ON public.meal_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own meal categories" ON public.meal_categories;
CREATE POLICY "Users can update their own meal categories"
    ON public.meal_categories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own meal categories" ON public.meal_categories;
CREATE POLICY "Users can delete their own meal categories"
    ON public.meal_categories FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Add category_id to public.diet_logs if not exists
ALTER TABLE public.diet_logs
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.meal_categories(id) ON DELETE SET NULL;

-- 5. Create index for fast ordered queries
CREATE INDEX IF NOT EXISTS idx_meal_categories_user_order ON public.meal_categories (user_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_diet_logs_category_id ON public.diet_logs (category_id);

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
