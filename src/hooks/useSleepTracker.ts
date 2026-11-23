import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/ProtectedRoute';
import type { SleepLog, SleepQuality, UserPreferences } from '../types/database';
import { scheduleBedtimeReminder } from '../utils/sleepNotificationUtils';
import { generateUUID } from '../lib/utils';

const SLEEP_STORAGE_KEY = 'gymtracker_sleep_logs_v1';
const PREFS_STORAGE_KEY = 'gymtracker_user_preferences_v1';

export function useSleepTracker() {
  const { user } = useAuth();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    user_id: user?.id || 'anon',
    target_bedtime: '22:30',
    sleep_reminder_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasWorkoutYesterday, setHasWorkoutYesterday] = useState(false);

  // Local storage keys
  const getLogsKey = useCallback(() => {
    return user ? `${SLEEP_STORAGE_KEY}_${user.id}` : `${SLEEP_STORAGE_KEY}_anon`;
  }, [user]);

  const getPrefsKey = useCallback(() => {
    return user ? `${PREFS_STORAGE_KEY}_${user.id}` : `${PREFS_STORAGE_KEY}_anon`;
  }, [user]);

  // Check if user worked out yesterday
  const checkWorkoutYesterday = useCallback(async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      // 1. Check local completed workouts
      const raw = localStorage.getItem('gymtracker_completed_workouts');
      if (raw) {
        try {
          const sessions: any[] = JSON.parse(raw);
          if (Array.isArray(sessions)) {
            const workedOut = sessions.some((s) => {
              if (!s || typeof s !== 'object') return false;
              const dateStr = (s.completedAt || s.startedAt || s.endTime || s.startTime || '').slice(0, 10);
              return dateStr === yesterdayStr;
            });
            if (workedOut) {
              setHasWorkoutYesterday(true);
              return;
            }
          }
        } catch {}
      }

      // 2. Query Supabase workouts if configured
      if (isSupabaseConfigured && user) {
        const startOfYesterday = new Date(yesterday);
        startOfYesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user.id)
          .gte('started_at', startOfYesterday.toISOString())
          .lte('started_at', endOfYesterday.toISOString())
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasWorkoutYesterday(true);
          return;
        }
      }

      setHasWorkoutYesterday(false);
    } catch (e) {
      console.warn('Error checking workout yesterday:', e);
      setHasWorkoutYesterday(false);
    }
  }, [user]);

  // Fetch sleep logs and preferences
  const fetchSleepData = useCallback(async () => {
    setIsLoading(true);

    let initialLogs: SleepLog[] = [];
    let initialPrefs: UserPreferences = {
      user_id: user?.id || 'anon',
      target_bedtime: '22:30',
      sleep_reminder_enabled: false,
    };

    // 1. Load from localStorage
    try {
      const cachedLogs = localStorage.getItem(getLogsKey());
      if (cachedLogs) initialLogs = JSON.parse(cachedLogs);

      const cachedPrefs = localStorage.getItem(getPrefsKey());
      if (cachedPrefs) initialPrefs = JSON.parse(cachedPrefs);
    } catch (e) {
      console.warn('Error reading local sleep cache:', e);
    }

    // 2. Query Supabase
    if (isSupabaseConfigured && user) {
      try {
        // Query sleep_logs
        const { data: logData, error: logErr } = await supabase
          .from('sleep_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('bedtime', { ascending: false });

        if (!logErr && logData) {
          initialLogs = logData as SleepLog[];
        }

        // Query user_preferences
        const { data: prefData, error: prefErr } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prefErr && prefData) {
          initialPrefs = {
            id: prefData.id,
            user_id: user.id,
            target_bedtime: prefData.target_bedtime || '22:30',
            sleep_reminder_enabled: Boolean(prefData.sleep_reminder_enabled),
          };
        }
      } catch (err) {
        console.warn('Supabase sleep data query fallback:', err);
      }
    }

    setSleepLogs(initialLogs);
    setPreferences(initialPrefs);

    // Sync notification schedule if enabled
    if (initialPrefs.sleep_reminder_enabled && initialPrefs.target_bedtime) {
      scheduleBedtimeReminder(initialPrefs.target_bedtime, true);
    }

    setIsLoading(false);
  }, [user, getLogsKey, getPrefsKey]);

  useEffect(() => {
    fetchSleepData();
    checkWorkoutYesterday();
  }, [fetchSleepData, checkWorkoutYesterday]);

  // Live cross-device synchronization via Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      const existing = supabase.getChannels().filter((c: any) => c.topic?.includes('sleep_tracker'));
      for (const ch of existing) {
        try { supabase.removeChannel(ch); } catch {}
      }
      const channelId = generateUUID();
      channel = supabase
        .channel(`realtime_sleep_tracker_${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sleep_logs' },
          () => {
            fetchSleepData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime sleep tracker subscription skipped:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchSleepData]);

  const latestSleep = useMemo(() => {
    return sleepLogs.length > 0 ? sleepLogs[0] : null;
  }, [sleepLogs]);

  // Recovery Warning: Sleep under 6 hours (< 360 mins) AND worked out yesterday
  const isRecoveryWarningActive = useMemo(() => {
    if (!latestSleep) return false;
    const isUnder6Hours = latestSleep.duration_minutes < 360;
    return isUnder6Hours && hasWorkoutYesterday;
  }, [latestSleep, hasWorkoutYesterday]);

  // Log a new sleep record
  const logSleep = useCallback(
    async (params: {
      bedtime: string;
      wake_time: string;
      duration_minutes: number;
      quality: SleepQuality;
      notes?: string;
    }) => {
      const newEntry: SleepLog = {
        id: generateUUID(),
        user_id: user?.id || 'anon',
        bedtime: params.bedtime,
        wake_time: params.wake_time,
        duration_minutes: params.duration_minutes,
        quality: params.quality,
        notes: params.notes || null,
        created_at: new Date().toISOString(),
      };

      const updated = [newEntry, ...sleepLogs].sort(
        (a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime()
      );

      setSleepLogs(updated);

      // Save locally
      try {
        localStorage.setItem(getLogsKey(), JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not cache sleep logs:', e);
      }

      // Save to Supabase
      if (isSupabaseConfigured && user) {
        try {
          const { data, error } = await supabase
            .from('sleep_logs')
            .upsert(
              {
                id: newEntry.id,
              user_id: user.id,
              bedtime: newEntry.bedtime,
              wake_time: newEntry.wake_time,
              duration_minutes: newEntry.duration_minutes,
              quality: newEntry.quality,
              notes: newEntry.notes,
            }, { onConflict: 'id' }).select()
            .single();

          if (error) {
            console.warn('Supabase sleep log insert error, backing up to metadata:', error.message);
            // Backup to auth user_metadata
            await supabase.auth.updateUser({
              data: { latest_sleep: newEntry },
            });
          } else if (data) {
            setSleepLogs((prev) =>
              prev.map((item) => (item.id === newEntry.id ? (data as SleepLog) : item))
            );
          }
        } catch (err) {
          console.warn('Sleep log insert error:', err);
        }
      }
    },
    [user, sleepLogs, getLogsKey]
  );

  // Delete a sleep record
  const deleteSleepLog = useCallback(
    async (id: string) => {
      const updated = sleepLogs.filter((l) => l.id !== id);
      setSleepLogs(updated);

      try {
        localStorage.setItem(getLogsKey(), JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update local sleep logs:', e);
      }

      if (isSupabaseConfigured && user) {
        try {
          await supabase.from('sleep_logs').delete().eq('id', id);
        } catch (err) {
          console.warn('Supabase delete sleep log error:', err);
        }
      }
    },
    [user, sleepLogs, getLogsKey]
  );

  // Update Bedtime Reminder Preferences
  const updatePreferences = useCallback(
    async (targetBedtime: string, sleepReminderEnabled: boolean) => {
      const newPrefs: UserPreferences = {
        ...preferences,
        target_bedtime: targetBedtime,
        sleep_reminder_enabled: sleepReminderEnabled,
        updated_at: new Date().toISOString(),
      };

      setPreferences(newPrefs);

      // Cache locally
      try {
        localStorage.setItem(getPrefsKey(), JSON.stringify(newPrefs));
      } catch (e) {
        console.warn('Could not cache user preferences:', e);
      }

      // Schedule or clear notification timer
      scheduleBedtimeReminder(targetBedtime, sleepReminderEnabled);

      // Save to Supabase
      if (isSupabaseConfigured && user) {
        try {
          const { error } = await supabase.from('user_preferences').upsert(
            {
              user_id: user.id,
              target_bedtime: targetBedtime,
              sleep_reminder_enabled: sleepReminderEnabled,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (error) {
            console.warn('Supabase user_preferences upsert error, saving to user_metadata:', error.message);
            await supabase.auth.updateUser({
              data: { sleep_preferences: newPrefs },
            });
          }
        } catch (err) {
          console.warn('Error saving user preferences:', err);
        }
      }
    },
    [user, preferences, getPrefsKey]
  );

  return {
    sleepLogs,
    latestSleep,
    preferences,
    isLoading,
    isRecoveryWarningActive,
    hasWorkoutYesterday,
    logSleep,
    deleteSleepLog,
    updatePreferences,
    refreshSleepData: fetchSleepData,
  };
}
