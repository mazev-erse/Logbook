import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';

/**
 * Trigger file download in browser using Blob
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a string field for standard CSV RFC 4180
 */
function escapeCsv(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 1. Export all completed workouts, exercises, and sets to CSV
 */
export async function exportWorkoutsToCsv() {
  let workoutsData: any[] = [];

  if (isSupabaseConfigured) {
    const user = await getAuthUser();
    if (user) {
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
            order_index,
            exercise:exercises (name, category),
            workout_sets (set_number, weight, reps, rpe, is_completed)
          )
        `)
        .order('completed_at', { ascending: false });

      if (!error && data) {
        workoutsData = data;
      }
    }
  }

  // Fallback to local storage completed workouts if no data returned
  if (workoutsData.length === 0) {
    const local = localStorage.getItem('gymtracker_completed_workouts');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        workoutsData = parsed.map((w: any) => ({
          ...w,
          started_at: w.startedAt,
          completed_at: w.completedAt,
          session_rpe: w.sessionRpe,
          workout_exercises: (w.exercises || []).map((ex: any, idx: number) => ({
            order_index: idx,
            exercise: { name: ex.exercise?.name || ex.name || 'Exercise', category: ex.exercise?.category || 'other' },
            workout_sets: (ex.sets || []).map((s: any) => ({
              set_number: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              is_completed: s.isCompleted,
            })),
          })),
        }));
      } catch (e) {
        console.error('Error parsing local workouts for export:', e);
      }
    }
  }

  // Generate CSV rows
  const headers = [
    'Date',
    'Workout Name',
    'Duration (mins)',
    'Exercise Name',
    'Muscle Category',
    'Set Order',
    'Weight (kg)',
    'Reps',
    'RPE',
    'Set Completed',
    'Workout Notes',
    'Mood',
    'Session RPE',
  ];

  const rows: string[] = [headers.join(',')];

  workoutsData.forEach((w) => {
    const start = new Date(w.started_at).getTime();
    const end = w.completed_at ? new Date(w.completed_at).getTime() : start;
    const durationMins = Math.max(1, Math.round((end - start) / 60000));
    const dateStr = w.completed_at ? new Date(w.completed_at).toISOString().split('T')[0] : '';

    const exercises = w.workout_exercises || [];
    exercises.forEach((we: any) => {
      const exName = we.exercise?.name || 'Exercise';
      const exCat = we.exercise?.category || '';
      const sets = we.workout_sets || [];

      sets.forEach((s: any) => {
        rows.push(
          [
            escapeCsv(dateStr),
            escapeCsv(w.name),
            escapeCsv(durationMins),
            escapeCsv(exName),
            escapeCsv(exCat),
            escapeCsv(s.set_number),
            escapeCsv(s.weight),
            escapeCsv(s.reps),
            escapeCsv(s.rpe || ''),
            escapeCsv(s.is_completed ? 'yes' : 'no'),
            escapeCsv(w.notes || ''),
            escapeCsv(w.mood || ''),
            escapeCsv(w.session_rpe || ''),
          ].join(',')
        );
      });
    });
  });

  const csvContent = rows.join('\r\n');
  const filename = `logbook-workouts-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  return workoutsData.length;
}

/**
 * 2. Export body metrics (weight & fat) to CSV
 */
export async function exportBodyMetricsToCsv() {
  let metrics: any[] = [];

  if (isSupabaseConfigured) {
    const user = await getAuthUser();
    if (user) {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .order('logged_at', { ascending: false });

      if (!error && data) metrics = data;
    }
  }

  if (metrics.length === 0) {
    const local = localStorage.getItem('gymtracker_body_metrics');
    if (local) {
      try {
        metrics = JSON.parse(local);
      } catch (e) {
        console.error('Error parsing local body metrics:', e);
      }
    }
  }

  const headers = ['Date', 'Weight (kg)', 'Body Fat (%)', 'Notes'];
  const rows = [headers.join(',')];

  metrics.forEach((m) => {
    const dateStr = m.logged_at ? new Date(m.logged_at).toISOString().split('T')[0] : '';
    rows.push(
      [
        escapeCsv(dateStr),
        escapeCsv(m.weight_kg),
        escapeCsv(m.body_fat_pct || ''),
        escapeCsv(m.notes || ''),
      ].join(',')
    );
  });

  const csvContent = rows.join('\r\n');
  const filename = `logbook-body-metrics-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  return metrics.length;
}

/**
 * 3. Export Diet logs to CSV
 */
export async function exportDietLogsToCsv() {
  let dietLogs: any[] = [];

  if (isSupabaseConfigured) {
    const user = await getAuthUser();
    if (user) {
      const { data, error } = await supabase
        .from('diet_logs')
        .select('*')
        .order('logged_at', { ascending: false });

      if (!error && data) dietLogs = data;
    }
  }

  if (dietLogs.length === 0) {
    const local = localStorage.getItem('gymtracker_diet_logs_v1');
    if (local) {
      try {
        dietLogs = JSON.parse(local);
      } catch (e) {
        console.error('Error parsing local diet logs:', e);
      }
    }
  }

  const headers = ['Date', 'Food Name', 'Meal Category', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fats (g)'];
  const rows = [headers.join(',')];

  dietLogs.forEach((d) => {
    const dateStr = d.logged_at ? new Date(d.logged_at).toISOString().split('T')[0] : '';
    rows.push(
      [
        escapeCsv(dateStr),
        escapeCsv(d.food_name),
        escapeCsv(d.meal_type),
        escapeCsv(d.calories),
        escapeCsv(d.protein),
        escapeCsv(d.carbs),
        escapeCsv(d.fats),
      ].join(',')
    );
  });

  const csvContent = rows.join('\r\n');
  const filename = `logbook-diet-logs-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  return dietLogs.length;
}

/**
 * 4. Export full portable JSON backup
 */
export async function exportFullBackupToJson() {
  const backup: Record<string, any> = {
    version: '2.0',
    app: 'Logbook Gym Tracker PWA',
    exportedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const user = await getAuthUser();
    if (user) {
      // Fetch all tables concurrently
      const [
        { data: profile },
        { data: workouts },
        { data: workoutExercises },
        { data: sets },
        { data: bodyMetrics },
        { data: dietLogs },
        { data: supplements },
        { data: recoveryLogs },
        { data: fitnessGoals },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('workouts').select('*').order('started_at', { ascending: false }),
        supabase.from('workout_exercises').select('*'),
        supabase.from('workout_sets').select('*'),
        supabase.from('body_metrics').select('*').order('logged_at', { ascending: false }),
        supabase.from('diet_logs').select('*').order('logged_at', { ascending: false }),
        supabase.from('supplement_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('active_recovery_logs').select('*').order('logged_at', { ascending: false }),
        supabase.from('fitness_goals').select('*').order('created_at', { ascending: false }),
      ]);

      backup.profile = profile || null;
      backup.workouts = workouts || [];
      backup.workout_exercises = workoutExercises || [];
      backup.workout_sets = sets || [];
      backup.body_metrics = bodyMetrics || [];
      backup.diet_logs = dietLogs || [];
      backup.supplement_logs = supplements || [];
      backup.active_recovery_logs = recoveryLogs || [];
      backup.fitness_goals = fitnessGoals || [];
    }
  }

  // Include local storage backup snapshot
  backup.localStorage = {
    user_profile: localStorage.getItem('gymtracker_user_profile'),
    completed_workouts: localStorage.getItem('gymtracker_completed_workouts'),
    diet_logs: localStorage.getItem('gymtracker_diet_logs_v1'),
    supplement_logs: localStorage.getItem('gymtracker_supplement_logs_v1'),
    active_recovery: localStorage.getItem('gymtracker_active_recovery_v1'),
    fitness_goal: localStorage.getItem('gymtracker_fitness_goal_v1'),
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const filename = `logbook-full-backup-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(jsonString, filename, 'application/json');
  return true;
}
