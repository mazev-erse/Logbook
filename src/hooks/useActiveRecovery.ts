import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import { generateUUID } from '../lib/utils';
import type { ActiveRecoveryLog, ActivityType, ActivityIntensity } from '../types/database';

const RECOVERY_STORAGE_KEY = 'gymtracker_active_recovery_v1';

// Calculate Monday of the current week (or 7 days ago)
export function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function useActiveRecovery() {
  const [logs, setLogs] = useState<ActiveRecoveryLog[]>(() => {
    const startOfWeek = getStartOfWeek();
    const saved = getCachedData<ActiveRecoveryLog[]>(RECOVERY_STORAGE_KEY, []);
    return saved
      .filter((item) => new Date(item.logged_at).getTime() >= startOfWeek.getTime())
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => logs.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  // Helper to check if date is today
  const isToday = useCallback((isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  }, []);

  // Fetch this week's logs
  const fetchWeeklyLogs = useCallback(async () => {
    setLogs((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });
    const startOfWeek = getStartOfWeek();

    if (!isSupabaseConfigured) {
      // Local storage fallback
      const saved = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (saved) {
        try {
          const parsed: ActiveRecoveryLog[] = JSON.parse(saved);
          const thisWeek = parsed.filter(
            (item) => new Date(item.logged_at).getTime() >= startOfWeek.getTime()
          );
          setLogs(thisWeek.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()));
        } catch (e) {
          console.error('Error parsing local recovery logs:', e);
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

      const { data, error } = await supabase
        .from('active_recovery_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startOfWeek.toISOString())
        .order('logged_at', { ascending: false });

      if (error) {
        console.warn('Error fetching active recovery logs from Supabase:', error.message);
        const saved = localStorage.getItem(RECOVERY_STORAGE_KEY);
        if (saved) {
          try {
            const parsed: ActiveRecoveryLog[] = JSON.parse(saved);
            const thisWeek = parsed.filter(
              (item) => new Date(item.logged_at).getTime() >= startOfWeek.getTime()
            );
            setLogs(thisWeek.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()));
          } catch {}
        }
      } else if (data) {
        setLogs(data as ActiveRecoveryLog[]);
        setCachedData(RECOVERY_STORAGE_KEY, data);
      }
    } catch (err) {
      console.error('Failed to load active recovery logs:', err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyLogs();
  }, [fetchWeeklyLogs]);

  // Live cross-device synchronization via Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      const existing = supabase.getChannels().filter((c: any) => c.topic?.includes('active_recovery'));
      for (const ch of existing) {
        try { supabase.removeChannel(ch); } catch {}
      }
      const channelId = generateUUID();
      channel = supabase
        .channel(`realtime_active_recovery_${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'active_recovery_logs' },
          () => {
            fetchWeeklyLogs();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime active recovery subscription skipped:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchWeeklyLogs]);

  // Insert a new activity log
  const addActivity = async (
    activity_type: ActivityType | string,
    duration_minutes: number,
    intensity: ActivityIntensity,
    calories_burned = 0,
    distance_km?: number,
    average_speed_kmh?: number,
    calculated_steps?: number
  ) => {
    const tempId = generateUUID();
    const nowIso = new Date().toISOString();

    const newLog: ActiveRecoveryLog = {
      id: tempId,
      user_id: 'local_user',
      activity_type,
      duration_minutes,
      intensity,
      calories_burned: Math.round(calories_burned),
      distance_km,
      average_speed_kmh,
      calculated_steps,
      logged_at: nowIso,
      created_at: nowIso,
    };

    // Optimistic UI update
    setLogs((prev) => [newLog, ...prev]);

    // Save to local storage
    try {
      const saved = localStorage.getItem(RECOVERY_STORAGE_KEY);
      const all: ActiveRecoveryLog[] = saved ? JSON.parse(saved) : [];
      all.unshift(newLog);
      localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving recovery log to local storage:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          const { data, error } = await supabase
            .from('active_recovery_logs')
            .upsert(
              {
                id: newLog.id,
                user_id: user.id,
                activity_type,
                duration_minutes,
                intensity,
                calories_burned: Math.round(calories_burned),
                distance_km,
                average_speed_kmh,
                calculated_steps,
                logged_at: nowIso,
              },
              { onConflict: 'id' }
            )
            .select()
            .single();

          if (error) {
            console.error('Error inserting recovery log into Supabase:', error.message);
          } else if (data) {
            setLogs((prev) =>
              prev.map((item) => (item.id === tempId ? (data as ActiveRecoveryLog) : item))
            );
          }
        }
      } catch (err) {
        console.error('Supabase recovery insert error:', err);
      }
    }
  };

  // Delete an activity log
  const deleteActivity = async (id: string) => {
    let prevLogs: ActiveRecoveryLog[] = [];
    // Optimistic UI update
    setLogs((prev) => {
      prevLogs = prev;
      return prev.filter((item) => item.id !== id);
    });

    // Update local storage
    try {
      const saved = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (saved) {
        const all: ActiveRecoveryLog[] = JSON.parse(saved);
        localStorage.setItem(
          RECOVERY_STORAGE_KEY,
          JSON.stringify(all.filter((item) => item.id !== id))
        );
      }
    } catch (e) {
      console.error('Error deleting recovery log from local storage:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          const { error } = await supabase.from('active_recovery_logs').delete().eq('id', id);
          if (error) {
            console.error('Failed to delete recovery log from Supabase:', error.message);
            setLogs(prevLogs);
          }
        }
      } catch (err) {
        console.error('Failed to delete recovery log from Supabase:', err);
        setLogs(prevLogs);
      }
    }
  };

  // Aggregated weekly & daily calculations
  const weeklyStats = useMemo(() => {
    const totalMinutes = logs.reduce((acc, item) => acc + item.duration_minutes, 0);
    const totalCalories = logs.reduce((acc, item) => acc + (item.calories_burned || 0), 0);
    const count = logs.length;
    return {
      totalMinutes,
      totalCalories,
      count,
    };
  }, [logs]);

  // Today's total burned calories for Diet tab integration
  const todayCaloriesBurned = useMemo(() => {
    return logs
      .filter((item) => isToday(item.logged_at))
      .reduce((acc, item) => acc + (item.calories_burned || 0), 0);
  }, [logs, isToday]);

  return {
    logs,
    isLoading,
    isRevalidating,
    addActivity,
    deleteActivity,
    weeklyStats,
    todayCaloriesBurned,
    refreshLogs: fetchWeeklyLogs,
  };
}
