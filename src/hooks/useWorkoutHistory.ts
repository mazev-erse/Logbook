import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser, batchSaveCompletedWorkout } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import type { ExerciseProgressPoint, PersonalRecord } from '../types/database';
import { calculate1RM, generateUUID } from '../lib/utils';
import { calculateDynamicStreak } from '../utils/streakProtection';

export interface ExerciseHistorySession {
  sessionId: string;
  workoutName: string;
  completedAt: string;
  displayDate: string;
  sets: { setNumber: number; weight: number; reps: number }[];
  maxWeight: number;
  best1RM: number;
  totalVolume: number;
}

export interface PastWorkoutSession {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  notes?: string | null;
  mood?: import('../types/database').WorkoutMood | null;
  sessionRpe?: number | null;
  exercises: {
    exerciseName: string;
    exerciseCategory: string;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      isCompleted: boolean;
    }[];
  }[];
}

function parseLocalCompletedWorkouts(): any[] {
  try {
    const saved = localStorage.getItem('gymtracker_completed_workouts');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error parsing local completed workouts:', e);
  }
  return [];
}

function formatLocalWorkout(w: any): PastWorkoutSession {
  if (!w || typeof w !== 'object') {
    return {
      id: generateUUID(),
      name: 'Workout',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMinutes: 0,
      totalVolume: 0,
      totalSets: 0,
      exercises: [],
    };
  }
  const start = w.startedAt ? new Date(w.startedAt).getTime() : Date.now();
  const end = w.completedAt ? new Date(w.completedAt).getTime() : start + 3600000;
  const durationMinutes = Math.max(1, Math.round((end - start) / 60000));
  let totalVolume = 0;
  let totalSets = 0;

  const exercises = (Array.isArray(w.exercises) ? w.exercises : []).map((ex: any) => {
    if (!ex || typeof ex !== 'object') return { exerciseName: 'Exercise', exerciseCategory: 'other', sets: [] };
    const sets = (Array.isArray(ex.sets) ? ex.sets : []).map((s: any) => {
      if (!s || typeof s !== 'object') return { setNumber: 1, weight: 0, reps: 0, isCompleted: false };
      const isDone = Boolean(s.isCompleted || (Number(s.weight) > 0 || Number(s.reps) > 0));
      if (isDone) {
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        totalSets += 1;
      }
      return {
        setNumber: s.setNumber || 1,
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        isCompleted: isDone,
      };
    });
    return {
      exerciseName: ex.exercise?.name || ex.exerciseName || 'Exercise',
      exerciseCategory: ex.exercise?.category || ex.exerciseCategory || 'other',
      sets,
    };
  });

  return {
    id: w.id || generateUUID(),
    name: w.name || 'Workout',
    startedAt: w.startedAt || new Date().toISOString(),
    completedAt: w.completedAt || w.startedAt || new Date().toISOString(),
    durationMinutes,
    totalVolume,
    totalSets,
    notes: w.notes || null,
    mood: w.mood || null,
    sessionRpe: w.sessionRpe || null,
    exercises,
  };
}

export function useWorkoutHistory() {
  const [sessions, setSessions] = useState<PastWorkoutSession[]>(() => {
    const cached = getCachedData<PastWorkoutSession[]>('gymtracker_workout_history_cache', []);
    if (cached.length > 0) return cached;
    return parseLocalCompletedWorkouts().map(formatLocalWorkout);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => sessions.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    setSessions((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });
    const localWorkouts = parseLocalCompletedWorkouts();

    if (!isSupabaseConfigured) {
      // Load purely local history
      const formatted = localWorkouts.map(formatLocalWorkout);
      setSessions(formatted);
      setIsLoading(false);
      setIsRevalidating(false);
      return;
    }

    try {
      const user = await getAuthUser();
      if (!user) {
        const formatted = localWorkouts.map(formatLocalWorkout);
        setSessions(formatted);
        setIsLoading(false);
      setIsRevalidating(false);
        return;
      }

      // Fetch completed workouts with relational joins
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          started_at,
          completed_at,
          notes,
          mood,
          session_rpe,
          workout_exercises (
            id,
            order_index,
            exercise:exercises (
              id,
              name,
              category
            ),
            workout_sets (
              id,
              set_number,
              weight,
              reps,
              is_completed
            )
          )
        `)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching workout history:', error.message);
        // Fallback to local cache if network/Supabase error
        const formatted = localWorkouts.map(formatLocalWorkout);
        setSessions(formatted);
      } else if (data) {
        const remoteIds = new Set<string>();

        const formatted: PastWorkoutSession[] = data.map((w: any) => {
          remoteIds.add(w.id);
          const start = new Date(w.started_at).getTime();
          const end = new Date(w.completed_at).getTime();
          const durationMinutes = Math.max(1, Math.round((end - start) / 60000));
          let totalVolume = 0;
          let totalSets = 0;

          const remoteExercises = w.workout_exercises || [];

          // HYBRID AUTO-HEAL: If Supabase has an empty workout_exercises array, check if local storage has the exercises!
          if (remoteExercises.length === 0) {
            const localMatch = localWorkouts.find(
              (lw) => lw.id === w.id || (lw.startedAt && lw.startedAt === w.started_at)
            );

            if (localMatch && localMatch.exercises && localMatch.exercises.length > 0) {
              const localFormatted = formatLocalWorkout(localMatch);
              // Trigger background repair upsert to Supabase
              batchSaveCompletedWorkout(localMatch, w.completed_at).catch((err) => {
                console.warn('Background auto-heal to Supabase deferred:', err);
              });

              return {
                id: w.id,
                name: w.name,
                startedAt: w.started_at,
                completedAt: w.completed_at,
                durationMinutes,
                totalVolume: localFormatted.totalVolume,
                totalSets: localFormatted.totalSets,
                notes: w.notes || localMatch.notes || null,
                mood: w.mood || localMatch.mood || null,
                sessionRpe: w.session_rpe || localMatch.sessionRpe || null,
                exercises: localFormatted.exercises,
              };
            }
          }

          const exercises = remoteExercises
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((we: any) => {
              const rawSets = we.workout_sets || we.sets || [];
              const sets = rawSets
                .sort((a: any, b: any) => a.set_number - b.set_number)
                .map((s: any) => {
                  const isDone = Boolean(s.is_completed || (Number(s.weight) > 0 || Number(s.reps) > 0));
                  if (isDone) {
                    totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
                    totalSets += 1;
                  }
                  return {
                    setNumber: s.set_number,
                    weight: Number(s.weight) || 0,
                    reps: Number(s.reps) || 0,
                    isCompleted: isDone,
                  };
                });

              return {
                exerciseName: we.exercise?.name || 'Exercise',
                exerciseCategory: we.exercise?.category || 'other',
                sets,
              };
            });

          return {
            id: w.id,
            name: w.name,
            startedAt: w.started_at,
            completedAt: w.completed_at,
            durationMinutes,
            totalVolume,
            totalSets,
            notes: w.notes || null,
            mood: w.mood || null,
            sessionRpe: w.session_rpe || null,
            exercises,
          };
        });

        // Also merge any local-only completed workouts that were never pushed to Supabase
        const localOnlySessions = localWorkouts
          .filter((lw) => !remoteIds.has(lw.id))
          .map(formatLocalWorkout);

        const allMerged = [...formatted, ...localOnlySessions].sort(
          (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
        );

        setSessions(allMerged);
        setCachedData('gymtracker_workout_history_cache', allMerged);
      }
    } catch (err) {
      console.error('Error in fetchHistory:', err);
      const formatted = localWorkouts.map(formatLocalWorkout);
      setSessions(formatted);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, []);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    let previousSessions: PastWorkoutSession[] = [];
    // 1. Optimistic UI update
    setSessions((prev) => {
      previousSessions = prev;
      const filtered = prev.filter((s) => s.id !== workoutId);
      setCachedData('gymtracker_workout_history_cache', filtered);
      return filtered;
    });

    // 2. Remove from localStorage
    try {
      const saved = localStorage.getItem('gymtracker_completed_workouts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((w: any) => w.id !== workoutId);
        localStorage.setItem('gymtracker_completed_workouts', JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Error updating localStorage on delete:', e);
    }

    // 3. Remove from Supabase with rollback
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
        if (error) {
          console.error('Error deleting workout in Supabase:', error.message);
          setSessions(previousSessions);
          localStorage.setItem('gymtracker_completed_workouts', JSON.stringify(previousSessions));
        }
      } catch (err) {
        console.error('Failed to delete workout from Supabase:', err);
        setSessions(previousSessions);
        localStorage.setItem('gymtracker_completed_workouts', JSON.stringify(previousSessions));
      }
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Live cross-device synchronization via Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      // Remove any stale workout history channels before registering a new one
      const existing = supabase.getChannels().filter((c: any) => c.topic?.includes('workout_history'));
      for (const ch of existing) {
        try { supabase.removeChannel(ch); } catch {}
      }

      const channelId = generateUUID();
      channel = supabase
        .channel(`realtime_workout_history_${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workouts' },
          () => {
            fetchHistory();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workout_sets' },
          () => {
            fetchHistory();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime workout history subscription skipped:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchHistory]);

  // Home metrics: dynamic 36-hour grace period streak calculation, workouts this week, recent PRs
  const homeMetrics = useMemo(() => {
    const now = new Date();
    const dynamicStreak = calculateDynamicStreak(sessions, now);

    if (sessions.length === 0) {
      return {
        workoutsThisWeek: 0,
        streakDays: 0,
        isGracePeriodActive: false,
        gracePeriodHoursRemaining: 0,
        streakStatus: 'broken' as const,
        totalWorkouts: 0,
        recentPRs: [] as PersonalRecord[],
      };
    }

    // Start of current week (Monday)
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutsThisWeek = sessions.filter((s) => {
      const date = new Date(s.completedAt || s.startedAt);
      return date >= startOfWeek;
    }).length;

    // Calculate Personal Records (highest weight logged per exercise)
    const prMap = new Map<string, PersonalRecord>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          if (!set.isCompleted || set.weight <= 0) continue;
          const est1RM = calculate1RM(set.weight, set.reps);
          const current = prMap.get(ex.exerciseName);
          if (!current || set.weight > current.maxWeight) {
            prMap.set(ex.exerciseName, {
              exerciseId: ex.exerciseName,
              exerciseName: ex.exerciseName,
              maxWeight: set.weight,
              maxRepsAtMaxWeight: set.reps,
              achievedAt: s.completedAt || s.startedAt,
              estimated1RM: est1RM,
            });
          }
        }
      }
    }

    const recentPRs = Array.from(prMap.values())
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
      .slice(0, 5);

    return {
      workoutsThisWeek,
      streakDays: dynamicStreak.streakDays,
      isGracePeriodActive: dynamicStreak.isGracePeriodActive,
      gracePeriodHoursRemaining: dynamicStreak.hoursRemaining,
      streakStatus: dynamicStreak.status,
      totalWorkouts: sessions.length,
      recentPRs,
    };
  }, [sessions]);

  // Aggregated progress data for an exercise
  const getExerciseProgress = useCallback(
    (exerciseName: string): ExerciseProgressPoint[] => {
      const points: ExerciseProgressPoint[] = [];

      // Sessions are sorted desc, reverse to get chronological asc order for charts
      const chronological = [...sessions].reverse();

      for (const s of chronological) {
        const matchingEx = s.exercises.find(
          (e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
        );
        if (!matchingEx) continue;

        let maxWeight = 0;
        let repsAtMax = 0;
        let totalVol = 0;

        let best1RM = 0;
        for (const set of matchingEx.sets) {
          if (!set.isCompleted || set.weight <= 0) continue;
          totalVol += set.weight * set.reps;
          if (set.weight > maxWeight) {
            maxWeight = set.weight;
            repsAtMax = set.reps;
          }
          const e1rm = calculate1RM(set.weight, set.reps);
          if (e1rm > best1RM) {
            best1RM = e1rm;
          }
        }

        if (maxWeight > 0) {
          const dateObj = new Date(s.completedAt || s.startedAt);
          points.push({
            date: s.completedAt || s.startedAt,
            displayDate: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
            weight: maxWeight,
            reps: repsAtMax,
            volume: totalVol,
            estimated1RM: best1RM > 0 ? best1RM : calculate1RM(maxWeight, repsAtMax),
          });
        }
      }

      return points;
    },
    [sessions]
  );

  // Progressive Overload: Retrieve previous session performance & PRs for an exercise
  const getPreviousExercisePerformance = useCallback(
    (exerciseName: string) => {
      let lastSessionDate: string | null = null;
      let lastSessionSets: { setNumber: number; weight: number; reps: number }[] = [];
      let maxWeight = 0;
      let maxRepsAtMaxWeight = 0;
      let max1RM = 0;

      for (const s of sessions) {
        const matchingEx = s.exercises.find(
          (e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
        );
        if (matchingEx) {
          // If we haven't recorded the most recent session's sets yet, take them (sessions are sorted desc)
          if (!lastSessionDate) {
            lastSessionDate = s.completedAt;
            lastSessionSets = matchingEx.sets
              .filter((set) => set.isCompleted)
              .map((set) => ({
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
              }));
          }

          // Calculate all-time PR across all sessions
          for (const set of matchingEx.sets) {
            if (!set.isCompleted || set.weight <= 0) continue;
            const est1RM = calculate1RM(set.weight, set.reps);
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
              maxRepsAtMaxWeight = set.reps;
            }
            if (est1RM > max1RM) {
              max1RM = est1RM;
            }
          }
        }
      }

      return {
        lastSessionDate,
        lastSessionSets,
        personalRecord:
          maxWeight > 0
            ? { maxWeight, maxRepsAtMaxWeight, estimated1RM: max1RM }
            : null,
      };
    },
    [sessions]
  );

  // Detailed historical sessions breakdown for a specific exercise
  const getExerciseHistorySessions = useCallback(
    (exerciseName: string): ExerciseHistorySession[] => {
      const results: ExerciseHistorySession[] = [];
      for (const s of sessions) {
        const matchingEx = s.exercises.find(
          (e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
        );
        if (!matchingEx) continue;

        const completedSets = matchingEx.sets
          .filter((set) => set.isCompleted && set.weight > 0 && set.reps > 0)
          .map((set) => ({
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
          }));

        if (completedSets.length === 0) continue;

        let maxWeight = 0;
        let best1RM = 0;
        let totalVol = 0;

        for (const set of completedSets) {
          totalVol += set.weight * set.reps;
          if (set.weight > maxWeight) maxWeight = set.weight;
          const e1rm = calculate1RM(set.weight, set.reps);
          if (e1rm > best1RM) best1RM = e1rm;
        }

        const dateObj = new Date(s.completedAt || s.startedAt);
        results.push({
          sessionId: s.id,
          workoutName: s.name,
          completedAt: s.completedAt || s.startedAt,
          displayDate: dateObj.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: dateObj.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
          }),
          sets: completedSets,
          maxWeight,
          best1RM,
          totalVolume: totalVol,
        });
      }
      return results;
    },
    [sessions]
  );

  return {
    sessions,
    isLoading,
    isRevalidating,
    refetchHistory: fetchHistory,
    deleteWorkout,
    homeMetrics,
    getExerciseProgress,
    getPreviousExercisePerformance,
    getExerciseHistorySessions,
  };
}
