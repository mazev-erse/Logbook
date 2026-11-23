import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { generateUUID } from '../lib/utils';
import type { MealCategory } from '../types/database';

const CATEGORIES_STORAGE_KEY = 'gymtracker_meal_categories_v1';

export const DEFAULT_MEAL_CATEGORIES: MealCategory[] = [
  { id: 'cat_breakfast', user_id: 'default', name: 'Breakfast', icon: 'Coffee', sequence_order: 1 },
  { id: 'cat_lunch', user_id: 'default', name: 'Lunch', icon: 'Sun', sequence_order: 2 },
  { id: 'cat_dinner', user_id: 'default', name: 'Dinner', icon: 'Moon', sequence_order: 3 },
  { id: 'cat_snacks', user_id: 'default', name: 'Snacks', icon: 'Apple', sequence_order: 4 },
];

export function useMealCategories() {
  const [categories, setCategories] = useState<MealCategory[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a.sequence_order - b.sequence_order);
        }
      }
    } catch {}
    return DEFAULT_MEAL_CATEGORIES;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => categories.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  // Sync state to local storage and user metadata
  const persistCategories = useCallback(async (cats: MealCategory[]) => {
    const sorted = [...cats].sort((a, b) => a.sequence_order - b.sequence_order);
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted));
      const user = await getAuthUser();
      if (user?.id) {
        localStorage.setItem(`gymtracker_meal_categories_${user.id}`, JSON.stringify(sorted));
        // Persist to Supabase Auth metadata for seamless cross-device cloud persistence
        try {
          await supabase.auth.updateUser({
            data: {
              meal_categories: sorted,
            },
          });
        } catch (metaErr) {
          console.warn('Could not sync meal categories to user_metadata:', metaErr);
        }
      }
    } catch (e) {
      console.error('Failed to persist meal categories:', e);
    }
  }, []);

  // Fetch meal categories from Supabase or local storage
  const fetchCategories = useCallback(async () => {
    setCategories((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });

    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed.sort((a, b) => a.sequence_order - b.sequence_order));
          }
        } catch {}
      }
      setIsLoading(false);
      setIsRevalidating(false);
      return;
    }

    try {
      const user = await getAuthUser();
      if (!user) {
        setIsLoading(false);
      setIsRevalidating(false);
        return;
      }

      const userStorageKey = `gymtracker_meal_categories_${user.id}`;
      const metadataCategories = ((user as any)?.user_metadata as any)?.meal_categories as MealCategory[] | undefined;
      const savedLocal = localStorage.getItem(userStorageKey) || localStorage.getItem(CATEGORIES_STORAGE_KEY);
      let localParsed: MealCategory[] | null = null;
      if (savedLocal) {
        try {
          localParsed = JSON.parse(savedLocal);
        } catch {}
      }

      // Try querying from public.meal_categories table
      const { data, error } = await supabase
        .from('meal_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sequence_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const sorted = (data as MealCategory[]).sort((a, b) => a.sequence_order - b.sequence_order);
        setCategories(sorted);
        persistCategories(sorted);
      } else if (metadataCategories && metadataCategories.length > 0) {
        const sorted = metadataCategories.sort((a, b) => a.sequence_order - b.sequence_order);
        setCategories(sorted);
        localStorage.setItem(userStorageKey, JSON.stringify(sorted));
      } else if (localParsed && localParsed.length > 0) {
        const sorted = localParsed.sort((a, b) => a.sequence_order - b.sequence_order);
        setCategories(sorted);
      } else {
        // First-time seed: initialize with default categories scoped to current user
        const seeded = DEFAULT_MEAL_CATEGORIES.map((c) => ({
          ...c,
          id: `cat_${generateUUID().slice(0, 8)}`,
          user_id: user.id,
        }));
        setCategories(seeded);
        persistCategories(seeded);

        // Try inserting into Supabase table if available
        try {
          await supabase.from('meal_categories').insert(seeded);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch meal categories:', err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [persistCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Add a new category
  const addCategory = useCallback(
    async (name: string, icon = 'Utensils') => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const user = await getAuthUser();
      const userId = user?.id || 'local_user';
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.sequence_order), 0);

      const newCat: MealCategory = {
        id: `cat_${generateUUID()}`,
        user_id: userId,
        name: trimmed,
        icon,
        sequence_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      };

      const updated = [...categories, newCat];
      setCategories(updated);
      await persistCategories(updated);

      if (isSupabaseConfigured && user?.id) {
        try {
          await supabase.from('meal_categories').upsert({
            id: newCat.id,
            user_id: user.id,
            name: newCat.name,
            icon: newCat.icon,
            sequence_order: newCat.sequence_order,
          }, { onConflict: 'id' });
        } catch (err) {
          console.warn('Could not insert meal category into table:', err);
        }
      }

      return newCat;
    },
    [categories, persistCategories]
  );

  // Rename or update a category
  const updateCategory = useCallback(
    async (id: string, updates: Partial<{ name: string; icon: string; sequence_order: number }>) => {
      const updated = categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat));
      setCategories(updated);
      await persistCategories(updated);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('meal_categories')
            .update({
              ...(updates.name ? { name: updates.name.trim() } : {}),
              ...(updates.icon ? { icon: updates.icon } : {}),
              ...(updates.sequence_order !== undefined ? { sequence_order: updates.sequence_order } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        } catch (err) {
          console.warn('Could not update meal category in table:', err);
        }
      }
    },
    [categories, persistCategories]
  );

  // Delete a category
  const deleteCategory = useCallback(
    async (id: string) => {
      const filtered = categories.filter((cat) => cat.id !== id);
      // Re-sequence remaining
      const resequenced = filtered.map((cat, index) => ({
        ...cat,
        sequence_order: index + 1,
      }));

      setCategories(resequenced);
      await persistCategories(resequenced);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('meal_categories').delete().eq('id', id);
        } catch (err) {
          console.warn('Could not delete meal category from table:', err);
        }
      }
    },
    [categories, persistCategories]
  );

  // Reorder categories via up/down arrows
  const reorderCategories = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const index = categories.findIndex((c) => c.id === id);
      if (index === -1) return;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= categories.length) return;

      const newOrder = [...categories];
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;

      // Assign sequence_order 1..N
      const resequenced = newOrder.map((cat, i) => ({
        ...cat,
        sequence_order: i + 1,
      }));

      setCategories(resequenced);
      await persistCategories(resequenced);

      if (isSupabaseConfigured) {
        try {
          for (const cat of resequenced) {
            await supabase
              .from('meal_categories')
              .update({ sequence_order: cat.sequence_order })
              .eq('id', cat.id);
          }
        } catch (err) {
          console.warn('Could not sync reordered sequence to table:', err);
        }
      }
    },
    [categories, persistCategories]
  );

  return {
    categories,
    isLoading,
    isRevalidating,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refreshCategories: fetchCategories,
  };
}
