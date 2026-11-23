import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import { getCachedData, setCachedData } from '../lib/swrCache';
import { generateUUID } from '../lib/utils';
import type { Routine, RoutineExercise } from '../types/database';

const ROUTINES_STORAGE_KEY = 'gymtracker_routines_v1';

// Pre-seeded classic system templates
export const SEED_TEMPLATES: Routine[] = [
  {
    id: 'tmpl-push-day',
    user_id: null,
    name: 'Push Day',
    description: 'Chest, Shoulders & Triceps hypertrophy focus',
    is_system_template: true,
    created_at: new Date().toISOString(),
    exercises: [
      {
        id: 'tmpl-pe-1',
        routine_id: 'tmpl-push-day',
        exercise_name: 'Barbell Bench Press',
        sequence_order: 1,
        target_sets: 3,
        target_reps: 8,
      },
      {
        id: 'tmpl-pe-2',
        routine_id: 'tmpl-push-day',
        exercise_name: 'Incline Dumbbell Press',
        sequence_order: 2,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'tmpl-pe-3',
        routine_id: 'tmpl-push-day',
        exercise_name: 'Overhead Press',
        sequence_order: 3,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'tmpl-pe-4',
        routine_id: 'tmpl-push-day',
        exercise_name: 'Tricep Rope Pushdown',
        sequence_order: 4,
        target_sets: 3,
        target_reps: 12,
      },
    ],
  },
  {
    id: 'tmpl-pull-day',
    user_id: null,
    name: 'Pull Day',
    description: 'Back, Rear Delts & Biceps strength focus',
    is_system_template: true,
    created_at: new Date().toISOString(),
    exercises: [
      {
        id: 'tmpl-pe-5',
        routine_id: 'tmpl-pull-day',
        exercise_name: 'Deadlift',
        sequence_order: 1,
        target_sets: 3,
        target_reps: 5,
      },
      {
        id: 'tmpl-pe-6',
        routine_id: 'tmpl-pull-day',
        exercise_name: 'Barbell Bent-Over Row',
        sequence_order: 2,
        target_sets: 3,
        target_reps: 8,
      },
      {
        id: 'tmpl-pe-7',
        routine_id: 'tmpl-pull-day',
        exercise_name: 'Lat Pulldown',
        sequence_order: 3,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'tmpl-pe-8',
        routine_id: 'tmpl-pull-day',
        exercise_name: 'Barbell Bicep Curl',
        sequence_order: 4,
        target_sets: 3,
        target_reps: 12,
      },
    ],
  },
  {
    id: 'tmpl-leg-day',
    user_id: null,
    name: 'Leg Day',
    description: 'Quads, Hamstrings & Calves power foundation',
    is_system_template: true,
    created_at: new Date().toISOString(),
    exercises: [
      {
        id: 'tmpl-pe-9',
        routine_id: 'tmpl-leg-day',
        exercise_name: 'Barbell Squat',
        sequence_order: 1,
        target_sets: 3,
        target_reps: 8,
      },
      {
        id: 'tmpl-pe-10',
        routine_id: 'tmpl-leg-day',
        exercise_name: 'Romanian Deadlift',
        sequence_order: 2,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'tmpl-pe-11',
        routine_id: 'tmpl-leg-day',
        exercise_name: 'Leg Press',
        sequence_order: 3,
        target_sets: 3,
        target_reps: 12,
      },
      {
        id: 'tmpl-pe-12',
        routine_id: 'tmpl-leg-day',
        exercise_name: 'Standing Calf Raise',
        sequence_order: 4,
        target_sets: 4,
        target_reps: 15,
      },
    ],
  },
  {
    id: 'tmpl-upper-lower',
    user_id: null,
    name: 'Upper/Lower Split',
    description: 'Efficient 4-day compound split for overall strength',
    is_system_template: true,
    created_at: new Date().toISOString(),
    exercises: [
      {
        id: 'tmpl-pe-13',
        routine_id: 'tmpl-upper-lower',
        exercise_name: 'Barbell Bench Press',
        sequence_order: 1,
        target_sets: 4,
        target_reps: 8,
      },
      {
        id: 'tmpl-pe-14',
        routine_id: 'tmpl-upper-lower',
        exercise_name: 'Barbell Bent-Over Row',
        sequence_order: 2,
        target_sets: 4,
        target_reps: 8,
      },
      {
        id: 'tmpl-pe-15',
        routine_id: 'tmpl-upper-lower',
        exercise_name: 'Overhead Press',
        sequence_order: 3,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'tmpl-pe-16',
        routine_id: 'tmpl-upper-lower',
        exercise_name: 'Pull Up',
        sequence_order: 4,
        target_sets: 3,
        target_reps: 10,
      },
    ],
  },
];

export function useRoutines() {
  const [userRoutines, setUserRoutines] = useState<Routine[]>(() => {
    const saved = getCachedData<Routine[]>(ROUTINES_STORAGE_KEY, []);
    return saved.filter((r) => !r.is_system_template);
  });
  const [systemTemplates, setSystemTemplates] = useState<Routine[]>(() => {
    const saved = getCachedData<Routine[]>(ROUTINES_STORAGE_KEY, []);
    const custom = saved.filter((r) => r.is_system_template);
    return custom.length > 0 ? custom : SEED_TEMPLATES;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => userRoutines.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);



  // Fetch routines and templates
  const fetchRoutines = useCallback(async () => {
    setUserRoutines((curr) => {
      if (curr.length === 0) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });

    if (!isSupabaseConfigured) {
      // Local storage fallback
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed: Routine[] = JSON.parse(saved);
          setUserRoutines(parsed.filter((r) => !r.is_system_template));
          const customTemplates = parsed.filter((r) => r.is_system_template);
          setSystemTemplates(customTemplates.length > 0 ? customTemplates : SEED_TEMPLATES);
        } catch (e) {
          console.error('Error parsing local routines:', e);
          setSystemTemplates(SEED_TEMPLATES);
        localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(SEED_TEMPLATES));
        }
      }
      setIsLoading(false);
      setIsRevalidating(false);
      return;
    }

    try {
      await getAuthUser();

      // Fetch routines with relational join on routine_exercises
      const { data, error } = await supabase
        .from('routines')
        .select(`
          id,
          user_id,
          name,
          description,
          is_system_template,
          created_at,
          routine_exercises (
            id,
            routine_id,
            exercise_id,
            exercise_name,
            sequence_order,
            target_sets,
            target_reps
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching routines from Supabase:', error.message);
        // Fallback to local
        const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
        if (saved) {
          try {
            const parsed: Routine[] = JSON.parse(saved);
            setUserRoutines(parsed.filter((r) => !r.is_system_template));
          } catch {}
        }
        setSystemTemplates([]);
      } else if (data) {
        const all: Routine[] = data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          description: r.description,
          is_system_template: r.is_system_template,
          created_at: r.created_at,
          exercises: (r.routine_exercises || []).sort(
            (a: RoutineExercise, b: RoutineExercise) => a.sequence_order - b.sequence_order
          ),
        }));

        const sys = all.filter((r) => r.is_system_template);
        const usr = all.filter((r) => !r.is_system_template);

        setSystemTemplates(sys.length > 0 ? sys : SEED_TEMPLATES);
        setUserRoutines(usr);

        // Keep local storage fresh
        setCachedData(ROUTINES_STORAGE_KEY, all);
      }
    } catch (err) {
      console.error('Failed to load routines:', err);
      setSystemTemplates([]);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  // Live cross-device synchronization via Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      const existing = supabase.getChannels().filter((c: any) => c.topic?.includes('routines'));
      for (const ch of existing) {
        try { supabase.removeChannel(ch); } catch {}
      }
      const channelId = generateUUID();
      channel = supabase
        .channel(`realtime_routines_${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'routines' },
          () => {
            fetchRoutines();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'routine_exercises' },
          () => {
            fetchRoutines();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime routines subscription skipped:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchRoutines]);

  // Create a new user routine
  const createRoutine = async (
    name: string,
    description: string,
    exercises: {
      exercise_name: string;
      exercise_id?: string;
      target_sets: number;
      target_reps: number;
    }[]
  ) => {
    const routineId = generateUUID();
    const nowIso = new Date().toISOString();

    const formattedExercises: RoutineExercise[] = exercises.map((ex, idx) => ({
      id: generateUUID(),
      routine_id: routineId,
      exercise_id: ex.exercise_id || null,
      exercise_name: ex.exercise_name,
      sequence_order: idx + 1,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      created_at: nowIso,
    }));

    const newRoutine: Routine = {
      id: routineId,
      user_id: 'local_user',
      name: name.trim(),
      description: description.trim() || null,
      is_system_template: false,
      created_at: nowIso,
      exercises: formattedExercises,
    };

    // Optimistically update UI
    setUserRoutines((prev) => [newRoutine, ...prev]);

    // Save to local storage
    try {
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      const all: Routine[] = saved ? JSON.parse(saved) : [];
      all.unshift(newRoutine);
      localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving routine to local storage:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          // 1. Insert routine
          const { data: rData, error: rError } = await supabase
            .from('routines')
            .upsert(
              {
                id: routineId,
                
              user_id: user.id,
              name: newRoutine.name,
              description: newRoutine.description,
              is_system_template: false,
            
              },
              { onConflict: 'id' }
            )
            .select()
            .single();

          if (rError) {
            console.error('Error creating routine in Supabase:', rError.message);
            return;
          }

          if (rData) {
            // 2. Batch insert routine exercises
            const exToInsert = formattedExercises.map((ex, idx) => ({
              id: ex.id,
              routine_id: routineId,
              exercise_name: ex.exercise_name,
              exercise_id: ex.exercise_id || null,
              sequence_order: idx + 1,
              target_sets: ex.target_sets,
              target_reps: ex.target_reps,
            }));

            const { data: exData, error: exError } = await supabase
              .from('routine_exercises')
              .upsert(exToInsert, { onConflict: 'id' })
              .select();

            if (exError) {
              console.error('Error creating routine exercises in Supabase:', exError.message);
            } else if (exData) {
              // Update state with confirmed Supabase IDs
              setUserRoutines((prev) =>
                prev.map((r) =>
                  r.id === routineId
                    ? {
                        ...r,
                        id: rData.id,
                        exercises: exData.sort((a, b) => a.sequence_order - b.sequence_order),
                      }
                    : r
                )
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to save routine in Supabase:', err);
      }
    }
  };

  // Update existing routine
  const updateRoutine = async (
    id: string,
    name: string,
    description: string,
    exercises: {
      exercise_name: string;
      exercise_id?: string;
      target_sets: number;
      target_reps: number;
    }[]
  ) => {
    const formattedExercises: RoutineExercise[] = exercises.map((ex, idx) => ({
      id: generateUUID(),
      routine_id: id,
      exercise_id: ex.exercise_id || null,
      exercise_name: ex.exercise_name,
      sequence_order: idx + 1,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
    }));

    // Optimistic UI update
    setUserRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              name: name.trim(),
              description: description.trim() || null,
              exercises: formattedExercises,
            }
          : r
      )
    );

    // Update local storage
    try {
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (saved) {
        const all: Routine[] = JSON.parse(saved);
        const updated = all.map((r) =>
          r.id === id
            ? {
                ...r,
                name: name.trim(),
                description: description.trim() || null,
                exercises: formattedExercises,
              }
            : r
        );
        localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error updating routine in local storage:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          // Update routine name/description
          await supabase
            .from('routines')
            .update({
              name: name.trim(),
              description: description.trim() || null,
            })
            .eq('id', id);

          // Delete existing exercises and re-insert
          await supabase.from('routine_exercises').delete().eq('routine_id', id);

          const exToInsert = exercises.map((ex, idx) => ({
            routine_id: id,
            exercise_name: ex.exercise_name,
            exercise_id: ex.exercise_id || null,
            sequence_order: idx + 1,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
          }));

          await supabase.from('routine_exercises').insert(exToInsert);
        }
      } catch (err) {
        console.error('Failed to update routine in Supabase:', err);
      }
    }
  };

  // Delete routine
  const deleteRoutine = async (id: string) => {
    let prevRoutines: Routine[] = [];
    // Optimistic UI update
    setUserRoutines((prev) => {
      prevRoutines = prev;
      return prev.filter((r) => r.id !== id);
    });

    // Update local storage
    try {
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (saved) {
        const all: Routine[] = JSON.parse(saved);
        localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(all.filter((r) => r.id !== id)));
      }
    } catch (e) {
      console.error('Error updating local storage on delete routine:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('routines').delete().eq('id', id);
        if (error) {
          console.error('Error deleting routine from Supabase:', error.message);
          setUserRoutines(prevRoutines);
        }
      } catch (err) {
        console.error('Failed to delete routine from Supabase:', err);
        setUserRoutines(prevRoutines);
      }
    }
  };

  return {
    userRoutines,
    systemTemplates,
    isLoading,
    isRevalidating,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    refreshRoutines: fetchRoutines,
  };
}
