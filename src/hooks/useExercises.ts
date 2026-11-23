import { useState, useEffect, useMemo } from 'react';
import type { Exercise, ExerciseCategory, EquipmentType } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getCachedData, setCachedData } from '../lib/swrCache';
import { generateUUID } from '../lib/utils';

// High quality fallback/seed exercises for local preview and instant startup
export const DEFAULT_EXERCISES: Exercise[] = [
  { id: '365482e8-06a3-4cef-bdc8-7d4999282222', user_id: null, name: 'Barbell Bench Press', category: 'chest', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: '01288946-78d6-4bd0-8fb3-46c985656408', user_id: null, name: 'Incline Dumbbell Press', category: 'chest', equipment: 'dumbbell', created_at: new Date().toISOString() },
  { id: '45748440-c438-4e23-8c86-34689a6b9f61', user_id: null, name: 'Cable Chest Fly', category: 'chest', equipment: 'cable', created_at: new Date().toISOString() },
  { id: '03459cf3-053b-43ca-9d29-0900db19003d', user_id: null, name: 'Push Up', category: 'chest', equipment: 'bodyweight', created_at: new Date().toISOString() },
  { id: '0f5c3117-a7b8-4814-a034-a8a420cd1cd3', user_id: null, name: 'Barbell Squat', category: 'legs', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: 'b1975fee-ab7d-46ff-b001-8d1ad4a00f43', user_id: null, name: 'Leg Press', category: 'legs', equipment: 'machine', created_at: new Date().toISOString() },
  { id: '4dcba39d-937a-4abb-9e46-5a65332a8afd', user_id: null, name: 'Romanian Deadlift', category: 'legs', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: 'd57e4e38-3b6d-4ef6-9906-c696551d1d7b', user_id: null, name: 'Standing Calf Raise', category: 'legs', equipment: 'machine', created_at: new Date().toISOString() },
  { id: '21f982bb-d6e6-4ca2-8d51-9978960564d5', user_id: null, name: 'Deadlift', category: 'back', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: 'c7a48ac2-1665-4794-861f-70e4771be51e', user_id: null, name: 'Barbell Bent-Over Row', category: 'back', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: 'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847', user_id: null, name: 'Lat Pulldown', category: 'back', equipment: 'cable', created_at: new Date().toISOString() },
  { id: 'a1956357-e6fc-491b-8d40-d54f57eed012', user_id: null, name: 'Seated Cable Row', category: 'back', equipment: 'cable', created_at: new Date().toISOString() },
  { id: 'dfc03ed6-6831-4d00-a783-d807cf0ff86c', user_id: null, name: 'Pull Up', category: 'back', equipment: 'bodyweight', created_at: new Date().toISOString() },
  { id: '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1', user_id: null, name: 'Overhead Press', category: 'shoulders', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: '00fa46ce-7b3e-4711-bf6f-57057d21ccfd', user_id: null, name: 'Dumbbell Lateral Raise', category: 'shoulders', equipment: 'dumbbell', created_at: new Date().toISOString() },
  { id: '1c835e73-c99b-49de-952e-5d0229df5215', user_id: null, name: 'Face Pull', category: 'shoulders', equipment: 'cable', created_at: new Date().toISOString() },
  { id: '30341c08-85ff-42ef-8834-b59d46a94bc7', user_id: null, name: 'Barbell Bicep Curl', category: 'arms', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af', user_id: null, name: 'Dumbbell Hammer Curl', category: 'arms', equipment: 'dumbbell', created_at: new Date().toISOString() },
  { id: '9a20e0a2-510b-4810-9a11-8d7a8efc0f69', user_id: null, name: 'Tricep Rope Pushdown', category: 'arms', equipment: 'cable', created_at: new Date().toISOString() },
  { id: '1208f0ed-0808-4622-aa2c-5432580be570', user_id: null, name: 'Skull Crusher', category: 'arms', equipment: 'barbell', created_at: new Date().toISOString() },
  { id: '227e94de-6b0f-4737-9c9c-421898a350ba', user_id: null, name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight', created_at: new Date().toISOString() },
  { id: 'b1d07991-f5d3-4969-8cf3-3773af583b04', user_id: null, name: 'Plank', category: 'core', equipment: 'bodyweight', created_at: new Date().toISOString() },
];

/**
 * Deduplicates exercises strictly by normalized name (lowercase trimmed)
 * to ensure that duplicates never appear in exercise selection lists.
 */
export function deduplicateExercises(items: Exercise[]): Exercise[] {
  const map = new Map<string, Exercise>();
  for (const item of items) {
    if (!item || !item.name) continue;
    const key = item.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      // Prioritize keeping the canonical default ID if available
      const isDefault = DEFAULT_EXERCISES.some((d) => d.id === item.id);
      if (isDefault) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values());
}

export function useExercises() {
  // Stale-While-Revalidate: Read cached exercises immediately for zero-latency initial render
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const cached = getCachedData<Exercise[]>('gymtracker_exercises_cache', []);
    if (cached.length > 0) return deduplicateExercises(cached);
    const stored = localStorage.getItem('gymtracker_custom_exercises');
    if (stored) {
      try {
        const custom = JSON.parse(stored);
        return deduplicateExercises([...DEFAULT_EXERCISES, ...custom]);
      } catch {}
    }
    return deduplicateExercises(DEFAULT_EXERCISES);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => exercises.length === 0);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');

  useEffect(() => {
    async function loadExercises() {
      setIsRevalidating(true);
      if (!isSupabaseConfigured) {
        // Load custom local exercises if any
        const stored = localStorage.getItem('gymtracker_custom_exercises');
        if (stored) {
          try {
            const custom = JSON.parse(stored);
            const deduped = deduplicateExercises([...DEFAULT_EXERCISES, ...custom]);
            setExercises(deduped);
            setCachedData('gymtracker_exercises_cache', deduped);
          } catch (e) {
            console.error('Error parsing stored exercises:', e);
          }
        }
        setIsLoading(false);
        setIsRevalidating(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching exercises:', error.message);
        } else if (data && data.length > 0) {
          const deduped = deduplicateExercises(data as Exercise[]);
          setExercises(deduped);
          setCachedData('gymtracker_exercises_cache', deduped);
        }
      } catch (err) {
        console.error('Error loading exercises:', err);
      } finally {
        setIsLoading(false);
        setIsRevalidating(false);
      }
    }

    loadExercises();
  }, []);

  const filteredExercises = useMemo(() => {
    const deduped = deduplicateExercises(exercises);
    return deduped.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchQuery, selectedCategory]);

  const addCustomExercise = async (name: string, category: ExerciseCategory, equipment: EquipmentType) => {
    const newEx: Exercise = {
      id: generateUUID(),
      user_id: null,
      name,
      category,
      equipment,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('exercises')
          .insert({
            name,
            category,
            equipment,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create custom exercise:', error.message);
        } else if (data) {
          setExercises((prev) => {
            const updated = deduplicateExercises([data as Exercise, ...prev]);
            setCachedData('gymtracker_exercises_cache', updated);
            return updated;
          });
          return data as Exercise;
        }
      } catch (err) {
        console.error('Exception creating exercise:', err);
      }
    }

    // Local fallback
    setExercises((prev) => {
      const updated = deduplicateExercises([newEx, ...prev]);
      setCachedData('gymtracker_exercises_cache', updated);
      return updated;
    });
    const stored = localStorage.getItem('gymtracker_custom_exercises');
    const existing = stored ? JSON.parse(stored) : [];
    localStorage.setItem('gymtracker_custom_exercises', JSON.stringify([newEx, ...existing]));
    return newEx;
  };

  return {
    exercises: filteredExercises,
    allExercises: deduplicateExercises(exercises),
    isLoading,
    isRevalidating,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addCustomExercise,
  };
}
