import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type {
  ActiveWorkout,
  ActiveExercise,
  ActiveSet,
  Exercise,
} from '../types/database';
import { supabase, isSupabaseConfigured, getAuthUser, batchSaveCompletedWorkout } from '../lib/supabaseClient';
import { generateUUID } from '../lib/utils';

const ACTIVE_WORKOUT_STORAGE_KEY = 'gymtracker_active_workout_v1';

export function useActiveWorkout(onSetCompleted?: (restSeconds?: number) => void) {
  const clientIdRef = useRef<string>(generateUUID());
  const channelRef = useRef<any>(null);
  const isReceivingRemoteUpdateRef = useRef<boolean>(false);

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => {
    const saved = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.startedAt) {
          const startedMs = new Date(parsed.startedAt).getTime();
          // Auto-heal stale startedAt if older than 35 hours to prevent grace period rejection
          if (isNaN(startedMs) || Date.now() - startedMs > 35 * 60 * 60 * 1000) {
            parsed.startedAt = new Date().toISOString();
          }
        }
        return parsed;
      } catch (e) {
        console.error('Error restoring active workout:', e);
      }
    }
    return null;
  });

  const activeWorkoutRef = useRef<ActiveWorkout | null>(activeWorkout);

  const [isSaving, setIsSaving] = useState(false);

  // Sync active workout to localStorage on changes (offline-first, zero-loss)
  useEffect(() => {
    activeWorkoutRef.current = activeWorkout;
    if (activeWorkout) {
      localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
    }
  }, [activeWorkout]);

  // Realtime Broadcast Channel: Live cross-device synchronization (Phone <-> Tablet <-> PC)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    async function setupBroadcastChannel() {
      try {
        const user = await getAuthUser();
        if (!user || !isMounted) return;

        const topic = `active_workout_sync_${user.id}`;
        const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${topic}` || c.topic === topic);
        if (existing) {
          try {
            await supabase.removeChannel(existing);
          } catch {}
        }

        const channel = supabase.channel(topic, {
          config: { broadcast: { self: false } },
        });

        channelRef.current = channel;

        channel
          .on('broadcast', { event: 'workout_state' }, ({ payload }: any) => {
            if (!payload || payload.senderId === clientIdRef.current) return;
            // CRITICAL: Never wipe out an ongoing workout with null from a remote broadcast
            if (!payload.workout || typeof payload.workout !== 'object' || !payload.workout.id) return;

            // Only adopt if we don't already have an active workout or it matches this session
            if (!activeWorkoutRef.current || activeWorkoutRef.current.id === payload.workout.id) {
              isReceivingRemoteUpdateRef.current = true;
              setActiveWorkout(payload.workout);
              setTimeout(() => {
                isReceivingRemoteUpdateRef.current = false;
              }, 50);
            }
          })
          .on('broadcast', { event: 'request_state' }, () => {
            if (activeWorkoutRef.current && channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'workout_state',
                payload: {
                  workout: activeWorkoutRef.current,
                  senderId: clientIdRef.current,
                },
              });
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              // Ask existing active devices for current in-progress workout on mount
              channel.send({
                type: 'broadcast',
                event: 'request_state',
                payload: { senderId: clientIdRef.current },
              });
            }
          });
      } catch (err) {
        console.warn('Realtime broadcast setup deferred:', err);
      }
    }

    setupBroadcastChannel();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Broadcast state changes to peer devices (debounced 150ms for responsive typing)
  useEffect(() => {
    if (isReceivingRemoteUpdateRef.current) return;
    if (!channelRef.current) return;
    // CRITICAL: Never broadcast when activeWorkout is null; idle devices must never wipe active workouts
    if (!activeWorkout) return;

    const timeout = setTimeout(() => {
      try {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'workout_state',
          payload: {
            workout: activeWorkout,
            senderId: clientIdRef.current,
          },
        });
      } catch (err) {
        console.warn('Broadcast send error:', err);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [activeWorkout]);

  // Start a new workout purely in local state (with optional prefill from routines)
  const startWorkout = useCallback(
    (
      name = 'Workout',
      prefill?: { exercise: Exercise; targetSets?: number; targetReps?: number }[],
      customStartedAt?: string
    ) => {
      const workoutId = generateUUID();
      const startedAt = customStartedAt || new Date().toISOString();

      let prefilledExercises: ActiveExercise[] = [];

      if (prefill && prefill.length > 0) {
        prefilledExercises = prefill.map((item) => {
          const weId = generateUUID();
          const countSets = item.targetSets && item.targetSets > 0 ? item.targetSets : 3;
          const countReps = item.targetReps && item.targetReps > 0 ? item.targetReps : 10;

          const sets: ActiveSet[] = Array.from({ length: countSets }, (_, sIdx) => ({
            id: generateUUID(),
            setNumber: sIdx + 1,
            weight: 0,
            reps: countReps,
            rpe: null,
            isCompleted: false,
          }));

          return {
            workoutExerciseId: weId,
            exercise: item.exercise,
            sets,
          };
        });
      }

      const newWorkout: ActiveWorkout = {
        id: workoutId,
        name,
        startedAt,
        exercises: prefilledExercises,
      };

      setActiveWorkout(newWorkout);

      // Instant broadcast
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'workout_state',
          payload: { workout: newWorkout, senderId: clientIdRef.current },
        });
      }

      return newWorkout;
    },
    []
  );

  // Add exercise to active workout (local state only)
  const addExercise = useCallback((exercise: Exercise) => {
    const workoutExerciseId = generateUUID();
    const initialSetId = generateUUID();

    const newExercise: ActiveExercise = {
      workoutExerciseId,
      exercise,
      sets: [
        {
          id: initialSetId,
          setNumber: 1,
          weight: 0,
          reps: 10,
          rpe: null,
          isCompleted: false,
        },
      ],
    };

    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise],
      };
    });
  }, []);

  // Remove exercise from active workout (local state only)
  const removeExercise = useCallback((workoutExerciseId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.filter((e) => e.workoutExerciseId !== workoutExerciseId),
      };
    });
  }, []);

  // Add set to an exercise (local state only)
  const addSet = useCallback((workoutExerciseId: string) => {
    const newSetId = generateUUID();

    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.workoutExerciseId !== workoutExerciseId) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: ActiveSet = {
            id: newSetId,
            setNumber: ex.sets.length + 1,
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 10,
            rpe: null,
            isCompleted: false,
          };
          return {
            ...ex,
            sets: [...ex.sets, newSet],
          };
        }),
      };
    });
  }, []);

  // Remove set from an exercise (local state only)
  const removeSet = useCallback((workoutExerciseId: string, setId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.workoutExerciseId !== workoutExerciseId) return ex;
          const filtered = ex.sets.filter((s) => s.id !== setId);
          // Renumber sets
          const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return {
            ...ex,
            sets: renumbered,
          };
        }),
      };
    });
  }, []);

  // Update set values in local React state (zero latency for sweaty hands)
  const updateSet = useCallback((workoutExerciseId: string, setId: string, updates: Partial<ActiveSet>) => {
    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.workoutExerciseId !== workoutExerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
          };
        }),
      };
    });
  }, []);

  // Toggle set completion: purely local state + rest timer trigger (zero network delay)
  const toggleCompleteSet = useCallback((workoutExerciseId: string, setId: string) => {
    let newlyCompleted = false;

    setActiveWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.workoutExerciseId !== workoutExerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                const nextState = !s.isCompleted;
                if (nextState) {
                  newlyCompleted = true;
                }
                return { ...s, isCompleted: nextState };
              }
              return s;
            }),
          };
        }),
      };
    });

    // If newly marked as completed, trigger rest timer
    if (newlyCompleted && onSetCompleted) {
      onSetCompleted(90);
    }
  }, [onSetCompleted]);

  // Finish workout session: dispatches single batch insert to Supabase
  const finishWorkout = useCallback(
    async (debriefData?: {
      notes?: string | null;
      mood?: import('../types/database').WorkoutMood | null;
      sessionRpe?: number | null;
      startedAt?: string | null;
    }) => {
      if (!activeWorkout) return;

      setIsSaving(true);
      const completedAt = new Date().toISOString();

      // Auto-complete any set with entered weight or reps so lifters never lose logged stats
      const updatedExercises = activeWorkout.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          ...s,
          isCompleted: s.isCompleted || (Number(s.weight) > 0 || Number(s.reps) > 0),
        })),
      }));

      const finalizedWorkout: ActiveWorkout = {
        ...activeWorkout,
        exercises: updatedExercises,
        startedAt: debriefData?.startedAt || activeWorkout.startedAt,
        notes: debriefData?.notes ?? activeWorkout.notes ?? null,
        mood: debriefData?.mood ?? activeWorkout.mood ?? null,
        sessionRpe: debriefData?.sessionRpe ?? activeWorkout.sessionRpe ?? null,
      };

      // Celebration confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899'],
        });
      } catch (e) {
        console.error('Confetti error:', e);
      }

      try {
        // Dispatch single batch insert to Supabase + cache locally
        await batchSaveCompletedWorkout(finalizedWorkout, completedAt);
        setActiveWorkout(null);

        // Notify peer devices that workout has concluded
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'workout_state',
            payload: { workout: null, senderId: clientIdRef.current },
          });
        }
      } catch (err) {
        console.error('Failed to batch save workout to Supabase:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [activeWorkout]
  );

  // Update workout started_at timestamp (for logging past workouts in grace period)
  const updateStartedAt = useCallback((startedAt: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return null;
      return { ...prev, startedAt };
    });
  }, []);

  // Cancel / discard workout
  const cancelWorkout = useCallback(() => {
    setActiveWorkout(null);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'workout_state',
        payload: { workout: null, senderId: clientIdRef.current },
      });
    }
  }, []);

  return {
    activeWorkout,
    isSaving,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleCompleteSet,
    finishWorkout,
    updateStartedAt,
    cancelWorkout,
  };
}
