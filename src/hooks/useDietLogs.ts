import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import { generateUUID } from '../lib/utils';
import type { DietLog, MacroSummary, MealType } from '../types/database';

const DIET_STORAGE_KEY = 'gymtracker_diet_logs_v1';

export const DEFAULT_MACRO_GOALS = {
  calorieGoal: 2500,
  proteinGoal: 160,
  carbsGoal: 260,
  fatsGoal: 70,
};

export function useDietLogs() {
  const isDateToday = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  };

  const [logs, setLogs] = useState<DietLog[]>(() => {
    const saved = getCachedData<DietLog[]>(DIET_STORAGE_KEY, []);
    return saved.filter((item) => isDateToday(item.logged_at));
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => logs.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  // Helper to determine if an ISO string is today (in local timezone)
  const isToday = useCallback((isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  }, []);

  // Fetch today's diet logs
  const fetchTodayLogs = useCallback(async () => {
    setLogs((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });

    if (!isSupabaseConfigured) {
      // Local storage fallback
      const saved = localStorage.getItem(DIET_STORAGE_KEY);
      if (saved) {
        try {
          const parsed: DietLog[] = JSON.parse(saved);
          const todayOnly = parsed.filter((item) => isToday(item.logged_at));
          setLogs(todayOnly);
        } catch (e) {
          console.error('Error parsing local diet logs:', e);
        }
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

      // Local day boundaries in ISO
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('diet_logs')
        .select('*')
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('Error fetching diet logs from Supabase:', error.message);
        // Fallback to local cache if offline
        const saved = localStorage.getItem(DIET_STORAGE_KEY);
        if (saved) {
          const parsed: DietLog[] = JSON.parse(saved);
          setLogs(parsed.filter((item) => isToday(item.logged_at)));
        }
      } else if (data) {
        const mapped: DietLog[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          food_name: d.food_name,
          meal_type: d.meal_type || 'snack',
          category_id: d.category_id || null,
          calories: Number(d.calories) || 0,
          protein: Number(d.protein) || 0,
          carbs: Number(d.carbs) || 0,
          fats: Number(d.fats) || 0,
          logged_at: d.logged_at,
          created_at: d.created_at,
        }));
        setLogs(mapped);

        // Mirror to local cache
        setCachedData(DIET_STORAGE_KEY, mapped);
      }
    } catch (err) {
      console.error('Failed to fetch diet logs:', err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [isToday]);

  useEffect(() => {
    fetchTodayLogs();
  }, [fetchTodayLogs]);

  // Live cross-device synchronization via Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      const existing = supabase.getChannels().filter((c: any) => c.topic?.includes('diet_logs'));
      for (const ch of existing) {
        try { supabase.removeChannel(ch); } catch {}
      }
      const channelId = generateUUID();
      channel = supabase
        .channel(`realtime_diet_logs_${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'diet_logs' },
          () => {
            fetchTodayLogs();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime diet logs subscription skipped:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchTodayLogs]);

  // Macro calculations for the current day
  const summary: MacroSummary = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    for (const log of logs) {
      calories += log.calories;
      protein += log.protein;
      carbs += log.carbs;
      fats += log.fats;
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fats: Math.round(fats),
      ...DEFAULT_MACRO_GOALS,
    };
  }, [logs]);

  // Grouped logs by meal type (legacy fallback)
  const groupedLogs = useMemo(() => {
    const groups: Record<MealType, DietLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    for (const log of logs) {
      const type = (log.meal_type as MealType) || 'snack';
      if (groups[type]) {
        groups[type].push(log);
      } else {
        groups.snack.push(log);
      }
    }

    return groups;
  }, [logs]);

  // Log a new food item
  const logFood = useCallback(
    async (entry: {
      food_name: string;
      meal_type: string;
      category_id?: string | null;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      logged_at?: string;
    }) => {
      const id = generateUUID();
      const now = entry.logged_at || new Date().toISOString();

      const normalizeMealType = (type: string) => {
        const lower = type.toLowerCase();
        if (['breakfast', 'lunch', 'dinner', 'snack'].includes(lower)) return lower;
        if (lower === 'snacks') return 'snack';
        return type; // Leave custom types as-is, though they require dropping the DB constraint
      };

      const normalizedMealType = normalizeMealType(entry.meal_type);

      const newLog: DietLog = {
        id,
        user_id: 'local-user',
        food_name: entry.food_name.trim(),
        meal_type: normalizedMealType,
        category_id: entry.category_id || null,
        calories: Number(entry.calories) || 0,
        protein: Number(entry.protein) || 0,
        carbs: Number(entry.carbs) || 0,
        fats: Number(entry.fats) || 0,
        logged_at: now,
        created_at: now,
      };

      // Optimistic local update
      setLogs((prev) => {
        const updated = [newLog, ...prev];
        localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      if (isSupabaseConfigured) {
        try {
          const user = await getAuthUser();
          if (user) {
            newLog.user_id = user.id;

            const payload: any = {
              id,
              user_id: user.id,
              food_name: newLog.food_name,
              meal_type: newLog.meal_type,
              calories: newLog.calories,
              protein: newLog.protein,
              carbs: newLog.carbs,
              fats: newLog.fats,
              logged_at: now,
            };

            if (newLog.category_id) {
              payload.category_id = newLog.category_id;
            }

            const { data, error } = await supabase
              .from('diet_logs').upsert(payload, { onConflict: 'id' })
              .select()
              .single();

            if (error) {
              // Fallback without category_id if table doesn't have the column yet
              if (payload.category_id) {
                console.warn('category_id column not present in schema cache, falling back to core insert:', error.message);
                delete payload.category_id;
                const { data: fallbackData, error: fallbackError } = await supabase
                  .from('diet_logs').upsert(payload, { onConflict: 'id' })
                  .select()
                  .single();

                if (fallbackError) {
                  console.error('Fallback food log insert also failed:', fallbackError.message);
                } else if (fallbackData) {
                  setLogs((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, user_id: fallbackData.user_id } : item))
                  );
                }
              } else {
                console.error('Error inserting food log into Supabase:', error.message);
              }
            } else if (data) {
              setLogs((prev) =>
                prev.map((item) => (item.id === id ? { ...item, user_id: data.user_id } : item))
              );
            }
          }
        } catch (err) {
          console.error('Failed to sync food log to Supabase:', err);
        }
      }

      return newLog;
    },
    []
  );

  // Delete a food item
  const deleteFood = useCallback(async (id: string) => {
    let prevLogs: DietLog[] = [];
    // Optimistic local removal
    setLogs((prev) => {
      prevLogs = prev;
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('diet_logs').delete().eq('id', id);
        if (error) {
          console.error('Error deleting diet log from Supabase:', error.message);
          setLogs(prevLogs);
          localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(prevLogs));
        }
      } catch (err) {
        console.error('Failed to delete diet log:', err);
        setLogs(prevLogs);
        localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(prevLogs));
      }
    }
  }, []);

  return {
    logs,
    groupedLogs,
    summary,
    isLoading,
    isRevalidating,
    logFood,
    deleteFood,
    refresh: fetchTodayLogs,
  };
}
