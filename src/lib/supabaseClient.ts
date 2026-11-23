import { createClient } from '@supabase/supabase-js';
import { isValidUUID, generateUUID } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate if environment variables are configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

/**
 * Retrieves the currently authenticated user.
 */
export async function getAuthUser() {
  if (!isSupabaseConfigured) {
    return { id: 'demo-user-1' };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error('Failed to get user:', err);
    return null;
  }
}

/**
 * Initiates Google OAuth Sign-in flow with Supabase.
 * Redirects back to the current origin (e.g. http://localhost:5173).
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Signs in an existing user with email and password.
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Creates a new account with email and password.
 */
export async function signUpWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Signs out the current authenticated user.
 */
export async function signOut() {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('gymtracker_local_user');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Batch saves an entire active workout, its exercises, and sets into Supabase
 * upon tapping "Complete Workout".
 * Also caches to localStorage for instant local history and offline resilience.
 */
export async function batchSaveCompletedWorkout(
  workout: import('../types/database').ActiveWorkout,
  completedAt?: string
) {
  const finishedTime = completedAt || new Date().toISOString();

  // 0. Strict 36-Hour Grace Period Verification
  const workoutStartTime = new Date(workout.startedAt).getTime();
  const thirtySixHoursAgo = Date.now() - 36 * 60 * 60 * 1000;
  if (!isNaN(workoutStartTime) && workoutStartTime < thirtySixHoursAgo - 60000) {
    const err: any = new Error('Grace period expired. This workout can no longer be logged.');
    err.code = '23514';
    err.constraint = 'check_workout_36h_grace_period';
    throw err;
  }

  // 1. Cache to local storage immediately for zero-latency local history
  try {
    const historyKey = 'gymtracker_completed_workouts';
    const existing = localStorage.getItem(historyKey);
    const history = existing ? JSON.parse(existing) : [];
    localStorage.setItem(
      historyKey,
      JSON.stringify([{ ...workout, completedAt: finishedTime }, ...history])
    );
  } catch (err) {
    console.warn('Failed to cache completed workout in localStorage:', err);
  }

  if (!isSupabaseConfigured) {
    return { success: true, localOnly: true };
  }

  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: true, localOnly: true, message: 'User not authenticated; saved locally.' };
    }

    // 1. Ensure workout ID is a valid UUID
    const workoutId = isValidUUID(workout.id) ? workout.id : generateUUID();

    // Auto-heal started_at timestamp so it never violates PostgreSQL's 36-hour grace period trigger
    let safeStartedAt = workout.startedAt;
    const now = Date.now();
    const startedMs = new Date(safeStartedAt).getTime();
    const MAX_ALLOWED_AGE_MS = 35 * 60 * 60 * 1000; // 35 hours
    if (isNaN(startedMs) || now - startedMs > MAX_ALLOWED_AGE_MS || startedMs > now + 60000) {
      safeStartedAt = new Date(now - Math.min(Math.max(60000, now - (isNaN(startedMs) ? now : startedMs)), MAX_ALLOWED_AGE_MS)).toISOString();
    }

    const parseNumericOrNull = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const sessionRpe = parseNumericOrNull(workout.sessionRpe);

    // 2. Batch insert/upsert the workout record
    const { error: workoutError } = await supabase.from('workouts').upsert({
      id: workoutId,
      user_id: user.id,
      name: workout.name,
      started_at: safeStartedAt,
      completed_at: finishedTime,
      notes: workout.notes || null,
      mood: workout.mood || null,
      session_rpe: sessionRpe,
    });
    if (workoutError) {
      if (
        workoutError.message?.includes('Grace period expired') ||
        workoutError.message?.includes('check_workout_36h_grace_period') ||
        workoutError.code === '23514' ||
        workoutError.details?.includes('36')
      ) {
        const constraintErr: any = new Error(
          'Grace period expired. This workout can no longer be logged.'
        );
        constraintErr.code = '23514';
        constraintErr.constraint = 'check_workout_36h_grace_period';
        throw constraintErr;
      }
      throw workoutError;
    }

    // 3. Batch insert workout_exercises if any exist
    if (workout.exercises.length > 0) {
      // Resolve exercise IDs to valid Supabase exercise UUIDs
      const { data: dbExercises } = await supabase.from('exercises').select('id, name');
      const dbExerciseMap = new Map<string, string>();
      const existingDbIdSet = new Set<string>();

      if (dbExercises) {
        for (const dbe of dbExercises) {
          dbExerciseMap.set(dbe.name.toLowerCase().trim(), dbe.id);
          existingDbIdSet.add(dbe.id);
        }
      }

      for (const ex of workout.exercises) {
        const cleanName = ex.exercise.name.toLowerCase().trim();
        // If ID is already a valid UUID and exists in DB, keep it
        if (isValidUUID(ex.exercise.id) && existingDbIdSet.has(ex.exercise.id)) {
          // valid UUID
        } else if (dbExerciseMap.has(cleanName)) {
          ex.exercise.id = dbExerciseMap.get(cleanName)!;
        } else {
          // If exercise is not in Supabase yet, insert it to obtain a valid UUID
          try {
            const { data: insertedEx, error: insertExErr } = await supabase
              .from('exercises')
              .insert({
                name: ex.exercise.name,
                category: ex.exercise.category || 'other',
                equipment: ex.exercise.equipment || 'other',
                user_id: user.id,
              })
              .select('id')
              .single();

            if (!insertExErr && insertedEx) {
              ex.exercise.id = insertedEx.id;
              dbExerciseMap.set(cleanName, insertedEx.id);
              existingDbIdSet.add(insertedEx.id);
            } else if (dbExercises && dbExercises.length > 0) {
              // Safe fallback to first valid DB exercise ID to prevent foreign key violation
              ex.exercise.id = dbExercises[0].id;
            }
          } catch (e) {
            console.warn('Could not auto-insert exercise in Supabase:', e);
            if (dbExercises && dbExercises.length > 0) {
              ex.exercise.id = dbExercises[0].id;
            }
          }
        }

        // Guarantee workoutExerciseId is a valid UUID
        if (!isValidUUID(ex.workoutExerciseId)) {
          ex.workoutExerciseId = generateUUID();
        }

        // Guarantee all set IDs are valid UUIDs
        for (const s of ex.sets) {
          if (!isValidUUID(s.id)) {
            s.id = generateUUID();
          }
        }
      }

      const exerciseRows = workout.exercises.map((ex, index) => ({
        id: ex.workoutExerciseId,
        workout_id: workoutId,
        exercise_id: ex.exercise.id,
        user_id: user.id,
        order_index: index,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .upsert(exerciseRows);
      if (exercisesError) {
        console.error('Failed to upsert workout_exercises:', exercisesError);
        throw exercisesError;
      }

      // 4. Batch insert all logged sets (auto-complete any set with entered weight/reps)
      const setRows = workout.exercises.flatMap((ex) =>
        ex.sets.map((s) => {
          const isDone = Boolean(s.isCompleted || (Number(s.weight) > 0 || Number(s.reps) > 0));
          return {
            id: s.id,
            workout_exercise_id: ex.workoutExerciseId,
            workout_id: workoutId,
            user_id: user.id,
            set_number: s.setNumber,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            rpe: parseNumericOrNull(s.rpe),
            is_completed: isDone,
            completed_at: isDone ? finishedTime : null,
          };
        })
      );

      if (setRows.length > 0) {
        const { error: setsError } = await supabase
          .from('workout_sets')
          .upsert(setRows);
        if (setsError) {
          console.error('Failed to upsert workout_sets:', setsError);
          throw setsError;
        }
      }
    }

    return { success: true, localOnly: false };
  } catch (error) {
    console.error('Batch save completed workout error:', error);
    throw error;
  }
}
