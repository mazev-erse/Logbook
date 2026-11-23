-- Create bangladeshi_foods table for custom local nutrition data
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

-- Index for fast ilike text search
CREATE INDEX IF NOT EXISTS idx_bangladeshi_foods_name ON public.bangladeshi_foods (food_name);

-- Enable RLS
ALTER TABLE public.bangladeshi_foods ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous users for searching
DROP POLICY IF EXISTS "Bangladeshi foods are viewable by everyone" ON public.bangladeshi_foods;
CREATE POLICY "Bangladeshi foods are viewable by everyone"
    ON public.bangladeshi_foods FOR SELECT
    USING (true);

-- Insert some common seeds
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
