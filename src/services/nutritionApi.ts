/**
 * Nutrition Database API Service
 * Integrates USDA FoodData Central & Open Food Facts with per-100g standard normalization.
 * Includes curated fitness & bodybuilding staple foods for instant zero-latency suggestions.
 */
import { supabase } from '../lib/supabaseClient';

export interface NutritionFoodItem {
  id: string;
  name: string;
  brand?: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  source: 'staple' | 'usda' | 'openfoodfacts' | 'local';
}

// Curated high-precision fitness staple database (Standard USDA values per 100g)
export const FITNESS_STAPLES: NutritionFoodItem[] = [
  {
    id: 'staple-chicken-breast-cooked',
    name: 'Chicken Breast (Cooked / Grilled)',
    brand: 'Fitness Staple',
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatsPer100g: 3.6,
    source: 'staple',
  },
  {
    id: 'staple-chicken-breast-raw',
    name: 'Chicken Breast (Raw)',
    brand: 'Fitness Staple',
    caloriesPer100g: 120,
    proteinPer100g: 22.5,
    carbsPer100g: 0.0,
    fatsPer100g: 2.6,
    source: 'staple',
  },
  {
    id: 'staple-ground-beef-90',
    name: 'Lean Ground Beef (90/10)',
    brand: 'Fitness Staple',
    caloriesPer100g: 176,
    proteinPer100g: 20.0,
    carbsPer100g: 0.0,
    fatsPer100g: 10.0,
    source: 'staple',
  },
  {
    id: 'staple-salmon-raw',
    name: 'Atlantic Salmon Fillet',
    brand: 'Fitness Staple',
    caloriesPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0.0,
    fatsPer100g: 13.4,
    source: 'staple',
  },
  {
    id: 'staple-tuna-canned',
    name: 'Canned Tuna (in Water)',
    brand: 'Fitness Staple',
    caloriesPer100g: 116,
    proteinPer100g: 25.5,
    carbsPer100g: 0.0,
    fatsPer100g: 1.0,
    source: 'staple',
  },
  {
    id: 'staple-whole-egg',
    name: 'Whole Large Egg',
    brand: 'Fitness Staple',
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatsPer100g: 9.5,
    source: 'staple',
  },
  {
    id: 'staple-egg-whites',
    name: 'Liquid Egg Whites',
    brand: 'Fitness Staple',
    caloriesPer100g: 52,
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatsPer100g: 0.2,
    source: 'staple',
  },
  {
    id: 'staple-whey-protein',
    name: 'Whey Protein Isolate / Powder',
    brand: 'Fitness Staple',
    caloriesPer100g: 390,
    proteinPer100g: 80.0,
    carbsPer100g: 5.0,
    fatsPer100g: 4.0,
    source: 'staple',
  },
  {
    id: 'staple-greek-yogurt-0',
    name: 'Greek Yogurt (Nonfat Plain 0%)',
    brand: 'Fitness Staple',
    caloriesPer100g: 59,
    proteinPer100g: 10.3,
    carbsPer100g: 3.6,
    fatsPer100g: 0.4,
    source: 'staple',
  },
  {
    id: 'staple-cottage-cheese',
    name: 'Cottage Cheese (Low Fat 2%)',
    brand: 'Fitness Staple',
    caloriesPer100g: 86,
    proteinPer100g: 11.8,
    carbsPer100g: 3.7,
    fatsPer100g: 2.5,
    source: 'staple',
  },
  {
    id: 'staple-white-rice-cooked',
    name: 'White Jasmine / Basmati Rice (Cooked)',
    brand: 'Fitness Staple',
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatsPer100g: 0.3,
    source: 'staple',
  },
  {
    id: 'staple-brown-rice-cooked',
    name: 'Brown Rice (Cooked)',
    brand: 'Fitness Staple',
    caloriesPer100g: 123,
    proteinPer100g: 2.7,
    carbsPer100g: 25.6,
    fatsPer100g: 1.0,
    source: 'staple',
  },
  {
    id: 'staple-rolled-oats',
    name: 'Rolled Oats (Dry)',
    brand: 'Fitness Staple',
    caloriesPer100g: 379,
    proteinPer100g: 13.2,
    carbsPer100g: 67.7,
    fatsPer100g: 6.5,
    source: 'staple',
  },
  {
    id: 'staple-sweet-potato',
    name: 'Sweet Potato (Baked / Boiled)',
    brand: 'Fitness Staple',
    caloriesPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatsPer100g: 0.2,
    source: 'staple',
  },
  {
    id: 'staple-white-potato',
    name: 'White Potato (Boiled / Russet)',
    brand: 'Fitness Staple',
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.0,
    fatsPer100g: 0.1,
    source: 'staple',
  },
  {
    id: 'staple-banana',
    name: 'Fresh Banana',
    brand: 'Fitness Staple',
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatsPer100g: 0.3,
    source: 'staple',
  },
  {
    id: 'staple-apple',
    name: 'Fresh Apple (with Skin)',
    brand: 'Fitness Staple',
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatsPer100g: 0.2,
    source: 'staple',
  },
  {
    id: 'staple-peanut-butter',
    name: 'Peanut Butter (100% Natural)',
    brand: 'Fitness Staple',
    caloriesPer100g: 588,
    proteinPer100g: 25.1,
    carbsPer100g: 20.0,
    fatsPer100g: 50.4,
    source: 'staple',
  },
  {
    id: 'staple-almonds',
    name: 'Raw Almonds',
    brand: 'Fitness Staple',
    caloriesPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatsPer100g: 49.9,
    source: 'staple',
  },
  {
    id: 'staple-olive-oil',
    name: 'Extra Virgin Olive Oil',
    brand: 'Fitness Staple',
    caloriesPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatsPer100g: 100.0,
    source: 'staple',
  },
  {
    id: 'staple-whole-wheat-bread',
    name: 'Whole Wheat Bread',
    brand: 'Fitness Staple',
    caloriesPer100g: 247,
    proteinPer100g: 13.0,
    carbsPer100g: 41.3,
    fatsPer100g: 3.4,
    source: 'staple',
  },
  {
    id: 'staple-pasta-cooked',
    name: 'Pasta / Spaghetti (Cooked)',
    brand: 'Fitness Staple',
    caloriesPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 30.9,
    fatsPer100g: 0.9,
    source: 'staple',
  },
  {
    id: 'staple-avocado',
    name: 'Fresh Avocado',
    brand: 'Fitness Staple',
    caloriesPer100g: 160,
    proteinPer100g: 2.0,
    carbsPer100g: 8.5,
    fatsPer100g: 14.7,
    source: 'staple',
  },
  {
    id: 'staple-broccoli',
    name: 'Broccoli (Steamed)',
    brand: 'Fitness Staple',
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7.2,
    fatsPer100g: 0.4,
    source: 'staple',
  },
];

/**
 * Searches nutrition database via USDA FoodData Central and Open Food Facts.
 * Blends local curated staples for instant response.
 *
 * @param query Search query string (e.g., "chicken breast")
 * @param signal AbortSignal for debouncing cancellation
 */
export async function searchNutritionApi(
  query: string,
  signal?: AbortSignal
): Promise<NutritionFoodItem[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  // 1. Instant match from curated fitness staples
  const stapleMatches = FITNESS_STAPLES.filter((item) =>
    item.name.toLowerCase().includes(trimmed)
  );

  // 2. Query custom bangladeshi_foods table from Supabase
  const localItems: NutritionFoodItem[] = [];
  try {
    const { data, error } = await supabase
      .from('bangladeshi_foods')
      .select('*')
      .or(`food_name.ilike.%${trimmed}%,search_tags.ilike.%${trimmed}%`)
      .abortSignal(signal || new AbortController().signal)
      .limit(10);

    if (error) {
      console.error('Supabase local foods search error:', error);
    } else if (data) {
      for (const item of data) {
        localItems.push({
          id: `local-${item.id}`,
          name: item.food_name,
          brand: 'Local Bangladeshi',
          caloriesPer100g: Number(item.calories_per_100g) || 0,
          proteinPer100g: Number(item.protein_per_100g) || 0,
          carbsPer100g: Number(item.carbs_per_100g) || 0,
          fatsPer100g: Number(item.fats_per_100g) || 0,
          source: 'local',
        });
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError' && err.name !== 'TypeError') {
      console.warn('Supabase local foods query failed:', err);
    }
  }

  // 3. Query USDA FoodData Central API
  const usdaItems: NutritionFoodItem[] = [];

  try {
    const usdaApiKey = (import.meta.env.VITE_USDA_API_KEY as string) || 'DEMO_KEY';
    const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      trimmed
    )}&api_key=${encodeURIComponent(usdaApiKey)}&pageSize=12`;

    const res = await fetch(usdaUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      const foods = data.foods || [];

      for (const f of foods) {
        const getNutrient = (names: string[]): number => {
          for (const name of names) {
            const found = f.foodNutrients?.find((n: any) =>
              n.nutrientName?.toLowerCase().includes(name.toLowerCase())
            );
            if (found && typeof found.value === 'number') {
              return found.value;
            }
          }
          return 0;
        };

        const calories = Math.round(
          getNutrient(['Energy', 'Energy (Atwater Specific Factors)', 'Calories'])
        );
        const protein = Math.round(getNutrient(['Protein']) * 10) / 10;
        const carbs =
          Math.round(
            getNutrient(['Carbohydrate, by difference', 'Carbohydrate']) * 10
          ) / 10;
        const fats =
          Math.round(
            getNutrient(['Total lipid (fat)', 'Total Fat', 'Fat']) * 10
          ) / 10;

        // Ensure item has valid nutrient info
        if (calories > 0 || protein > 0 || carbs > 0 || fats > 0) {
          usdaItems.push({
            id: `usda-${f.fdcId}`,
            name: f.description,
            brand: f.brandOwner || f.brandName || null,
            caloriesPer100g: calories,
            proteinPer100g: protein,
            carbsPer100g: carbs,
            fatsPer100g: fats,
            source: 'usda',
          });
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('USDA API query failed, falling back to staples/cache:', err);
    }
  }

  // Deduplicate results by normalized name
  const seenNames = new Set<string>();
  const combined: NutritionFoodItem[] = [];

  // Add Local Matches first (highest priority)
  for (const item of localItems) {
    const key = item.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combined.push(item);
    }
  }

  // Add staple matches second (higher priority for fitness athletes)
  for (const item of stapleMatches) {
    const key = item.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combined.push(item);
    }
  }

  // Add USDA results last
  for (const item of usdaItems) {
    const key = item.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combined.push(item);
    }
  }

  return combined;
}
