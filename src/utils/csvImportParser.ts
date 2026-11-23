import { generateUUID } from '../lib/utils';

/**
 * Robust CSV Line Tokenizer conforming to RFC 4180
 * Handles double-quoted fields with embedded commas and escaped quotes ("")
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export interface ParsedWorkoutExercise {
  exerciseName: string;
  sets: {
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number | null;
    isCompleted: boolean;
  }[];
}

export interface ParsedWorkout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  notes?: string;
  exercises: ParsedWorkoutExercise[];
  totalSets: number;
  totalVolume: number;
}

export interface ParsedCsvSummary {
  format: 'Strong' | 'Hevy' | 'Logbook' | 'Generic';
  workouts: ParsedWorkout[];
  totalWorkouts: number;
  totalSets: number;
  dateRange: { start: string; end: string };
  uniqueExercises: string[];
}

/**
 * Parses raw CSV string from Strong, Hevy, or Logbook exports
 */
export function parseWorkoutCsv(csvText: string): ParsedCsvSummary {
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    throw new Error('CSV file appears to be empty or has no data rows.');
  }

  // Parse headers
  const headerLine = rawLines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/['"]+/g, '').trim());

  // 1. Detect Format
  let format: 'Strong' | 'Hevy' | 'Logbook' | 'Generic' = 'Generic';

  const hasCol = (term: string) => headers.some((h) => h.includes(term.toLowerCase()));

  if (hasCol('exercise_title') || hasCol('weight_kg') || hasCol('set_index')) {
    format = 'Hevy';
  } else if (hasCol('workout name') && (hasCol('set order') || hasCol('weight unit'))) {
    format = 'Strong';
  } else if (hasCol('workout name') && hasCol('exercise name')) {
    format = 'Logbook';
  }

  // Column index lookups
  const findIdx = (possibleNames: string[]) => {
    return headers.findIndex((h) =>
      possibleNames.some((name) => h === name || h.includes(name))
    );
  };

  const dateIdx = findIdx(['date', 'start_time', 'start time']);
  const titleIdx = findIdx(['workout name', 'title', 'routine name']);
  const exerciseIdx = findIdx(['exercise name', 'exercise_title', 'exercise']);
  const setOrderIdx = findIdx(['set order', 'set_index', 'set number', 'set']);
  const weightIdx = findIdx(['weight (kg)', 'weight_kg', 'weight']);
  const weightUnitIdx = findIdx(['weight unit']);
  const repsIdx = findIdx(['reps']);
  const rpeIdx = findIdx(['rpe']);
  const notesIdx = findIdx(['workout notes', 'description', 'notes']);

  if (dateIdx === -1 || exerciseIdx === -1 || weightIdx === -1 || repsIdx === -1) {
    throw new Error(
      `Unrecognized CSV columns. We need at least Date, Exercise, Weight, and Reps. Detected headers: ${headers.slice(0, 8).join(', ')}`
    );
  }

  // Temporary group by Workout key: Date + Workout Title
  const workoutGroups = new Map<string, {
    name: string;
    startedAt: string;
    completedAt: string;
    notes?: string;
    exercisesMap: Map<string, {
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
      isCompleted: boolean;
    }[]>;
  }>();

  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCsvLine(rawLines[i]);
    if (cols.length < 3) continue;

    const rawDate = cols[dateIdx] || '';
    const rawTitle = titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx] : 'Workout';
    const rawExercise = cols[exerciseIdx] || '';
    if (!rawExercise) continue;

    // Standardize date
    let parsedDate: Date;
    try {
      parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }
    } catch {
      parsedDate = new Date();
    }
    const isoDate = parsedDate.toISOString();
    const dateDay = isoDate.split('T')[0];

    // Key to group rows belonging to the same workout
    const groupKey = `${dateDay}__${rawTitle}`;

    // Numeric parsing
    let weight = parseFloat(cols[weightIdx]) || 0;
    const isLbs =
      weightUnitIdx !== -1 && cols[weightUnitIdx]
        ? cols[weightUnitIdx].toLowerCase().includes('lbs')
        : headers[weightIdx]?.includes('lbs');

    if (isLbs && weight > 0) {
      weight = Math.round((weight * 0.45359237) * 10) / 10;
    }

    const reps = parseInt(cols[repsIdx], 10) || 0;
    const rpe = rpeIdx !== -1 && cols[rpeIdx] ? parseFloat(cols[rpeIdx]) || null : null;
    const setNum = setOrderIdx !== -1 ? parseInt(cols[setOrderIdx], 10) || 1 : 1;
    const notes = notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx] : undefined;

    if (!workoutGroups.has(groupKey)) {
      workoutGroups.set(groupKey, {
        name: rawTitle,
        startedAt: isoDate,
        completedAt: isoDate,
        notes,
        exercisesMap: new Map(),
      });
    }

    const group = workoutGroups.get(groupKey)!;
    if (notes && !group.notes) group.notes = notes;

    if (!group.exercisesMap.has(rawExercise)) {
      group.exercisesMap.set(rawExercise, []);
    }

    group.exercisesMap.get(rawExercise)!.push({
      setNumber: setNum || group.exercisesMap.get(rawExercise)!.length + 1,
      weight,
      reps,
      rpe,
      isCompleted: true,
    });
  }

  // Convert map to structured output
  const uniqueExercisesSet = new Set<string>();
  const parsedWorkouts: ParsedWorkout[] = [];
  let totalSetsCount = 0;

  workoutGroups.forEach((val, _key) => {
    const exercises: ParsedWorkoutExercise[] = [];
    let workoutVol = 0;
    let workoutSetsCount = 0;

    val.exercisesMap.forEach((sets, exName) => {
      uniqueExercisesSet.add(exName);

      // Sort sets by setNumber
      sets.sort((a, b) => a.setNumber - b.setNumber);

      // Fix sequence numbering if duplicated
      sets.forEach((s, idx) => {
        s.setNumber = idx + 1;
        workoutVol += s.weight * s.reps;
        workoutSetsCount += 1;
      });

      exercises.push({
        exerciseName: exName,
        sets,
      });
    });

    totalSetsCount += workoutSetsCount;

    parsedWorkouts.push({
      id: generateUUID(),
      name: val.name,
      startedAt: val.startedAt,
      completedAt: val.completedAt,
      notes: val.notes,
      exercises,
      totalSets: workoutSetsCount,
      totalVolume: workoutVol,
    });
  });

  // Sort workouts newest first
  parsedWorkouts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const dateRange = {
    start: parsedWorkouts.length > 0 ? parsedWorkouts[parsedWorkouts.length - 1].completedAt.split('T')[0] : '',
    end: parsedWorkouts.length > 0 ? parsedWorkouts[0].completedAt.split('T')[0] : '',
  };

  return {
    format,
    workouts: parsedWorkouts,
    totalWorkouts: parsedWorkouts.length,
    totalSets: totalSetsCount,
    dateRange,
    uniqueExercises: Array.from(uniqueExercisesSet).sort(),
  };
}
