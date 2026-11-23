import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getAuthUser } from '../lib/supabaseClient';
import type { FitnessGoal, GoalType } from '../types/database';

const GOALS_STORAGE_KEY = 'gymtracker_fitness_goals_v1';

export function useFitnessGoal() {
  // Initialize immediately from localStorage for 0ms initial load and no flickering
  const [activeGoal, setActiveGoal] = useState<FitnessGoal | null>(() => {
    try {
      const saved = localStorage.getItem(GOALS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [latestWeight, setLatestWeight] = useState<number | null>(() => {
    try {
      const savedMetrics = localStorage.getItem('gymtracker_body_metrics');
      if (savedMetrics) {
        const parsed = JSON.parse(savedMetrics);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Number(parsed[parsed.length - 1].weight) || null;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !activeGoal);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  // Fetch active goal and latest logged weight
  const fetchGoalData = useCallback(async () => {
    setActiveGoal((curr) => {
      if (!curr) setIsLoading(true);
      else setIsRevalidating(true);
      return curr;
    });

    if (!isSupabaseConfigured) {
      // 1. Load local goal
      const savedGoal = localStorage.getItem(GOALS_STORAGE_KEY);
      if (savedGoal) {
        try {
          setActiveGoal(JSON.parse(savedGoal));
        } catch (e) {
          console.error('Error parsing local goal:', e);
        }
      } else {
        // Seed a realistic default active goal for local preview
        const defaultGoal: FitnessGoal = {
          id: 'goal_preview',
          user_id: 'local_user',
          goal_type: 'Cutting',
          start_weight: 81.0,
          target_weight: 75.0,
          target_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          age: 22,
          biological_sex: 'male',
          height: 175,
          activity_level: 1.55,
          bmr: 1750,
          tdee: 2713,
          daily_calorie_goal: 2213,
          protein_goal: 178,
          carbs_goal: 240,
          fats_goal: 61,
        };
        setActiveGoal(defaultGoal);
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(defaultGoal));
      }

      // 2. Load local latest weight
      const savedMetrics = localStorage.getItem('gymtracker_body_metrics');
      if (savedMetrics) {
        try {
          const parsed = JSON.parse(savedMetrics);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLatestWeight(parsed[parsed.length - 1].weight);
          } else {
            setLatestWeight(78.5);
          }
        } catch {
          setLatestWeight(78.5);
        }
      } else {
        setLatestWeight(78.5);
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

      const userStorageKey = `gymtracker_fitness_goals_${user.id}`;

      // Read fallback data sources (user_metadata and localStorage)
      const metadataGoal = (((user as any)?.user_metadata as any)?.fitness_goals as FitnessGoal) || null;
      const savedGoalStr = localStorage.getItem(userStorageKey) || localStorage.getItem(GOALS_STORAGE_KEY);
      let localGoal: Partial<FitnessGoal> | null = null;
      if (savedGoalStr) {
        try {
          localGoal = JSON.parse(savedGoalStr);
        } catch {}
      }

      // 1. Fetch latest fitness goal from DB
      const { data: goalData, error: goalError } = await supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalError && goalError.code !== 'PGRST116') {
        console.warn('Error fetching fitness goal from Supabase:', goalError.message);
      }

      if (goalData) {
        // Goal exists in Supabase table
        // Notice: If Supabase table does not yet have extended columns,
        // goalData.daily_calorie_goal etc. will be undefined/null.
        // We seamlessly restore those targets from metadataGoal or localGoal!
        const mergedGoal: FitnessGoal = {
          id: goalData.id,
          user_id: goalData.user_id,
          goal_type: goalData.goal_type,
          start_weight: Number(goalData.start_weight),
          target_weight: Number(goalData.target_weight),
          target_date: goalData.target_date,
          created_at: goalData.created_at,
          age: goalData.age ?? metadataGoal?.age ?? localGoal?.age ?? 22,
          biological_sex: goalData.biological_sex ?? metadataGoal?.biological_sex ?? localGoal?.biological_sex ?? 'male',
          height: goalData.height ?? metadataGoal?.height ?? localGoal?.height ?? 175,
          activity_level: goalData.activity_level ?? metadataGoal?.activity_level ?? localGoal?.activity_level ?? 1.55,
          bmr: goalData.bmr ?? metadataGoal?.bmr ?? localGoal?.bmr,
          tdee: goalData.tdee ?? metadataGoal?.tdee ?? localGoal?.tdee,
          daily_calorie_goal: goalData.daily_calorie_goal ?? metadataGoal?.daily_calorie_goal ?? localGoal?.daily_calorie_goal,
          protein_goal: goalData.protein_goal ?? metadataGoal?.protein_goal ?? localGoal?.protein_goal,
          carbs_goal: goalData.carbs_goal ?? metadataGoal?.carbs_goal ?? localGoal?.carbs_goal,
          fats_goal: goalData.fats_goal ?? metadataGoal?.fats_goal ?? localGoal?.fats_goal,
        };

        // Recalculate BMR / TDEE if missing
        if (!mergedGoal.bmr || !mergedGoal.tdee) {
          const w = mergedGoal.start_weight || 75;
          const h = mergedGoal.height || 175;
          const a = mergedGoal.age || 22;
          let calcBmr = 10 * w + 6.25 * h - 5 * a;
          calcBmr += mergedGoal.biological_sex === 'female' ? -161 : 5;
          mergedGoal.bmr = Math.max(800, Math.round(calcBmr));
          mergedGoal.tdee = Math.max(1000, Math.round(mergedGoal.bmr * (mergedGoal.activity_level || 1.55)));
        }

        // Auto-fill macro goals if missing
        if (!mergedGoal.daily_calorie_goal) {
          if (mergedGoal.goal_type === 'Cutting') {
            mergedGoal.daily_calorie_goal = Math.max(1200, mergedGoal.tdee - 500);
            mergedGoal.protein_goal = Math.round((mergedGoal.start_weight || 75) * 2.2);
            const fats = Math.max(30, Math.round((mergedGoal.daily_calorie_goal * 0.25) / 9));
            mergedGoal.fats_goal = fats;
            mergedGoal.carbs_goal = Math.max(50, Math.round((mergedGoal.daily_calorie_goal - (mergedGoal.protein_goal * 4 + fats * 9)) / 4));
          } else if (mergedGoal.goal_type === 'Bulking') {
            mergedGoal.daily_calorie_goal = Math.max(1200, mergedGoal.tdee + 350);
            mergedGoal.protein_goal = Math.round((mergedGoal.start_weight || 75) * 2.0);
            const fats = Math.max(30, Math.round((mergedGoal.daily_calorie_goal * 0.25) / 9));
            mergedGoal.fats_goal = fats;
            mergedGoal.carbs_goal = Math.max(50, Math.round((mergedGoal.daily_calorie_goal - (mergedGoal.protein_goal * 4 + fats * 9)) / 4));
          } else {
            mergedGoal.daily_calorie_goal = mergedGoal.tdee;
            mergedGoal.protein_goal = Math.round((mergedGoal.start_weight || 75) * 2.0);
            const fats = Math.max(30, Math.round((mergedGoal.daily_calorie_goal * 0.25) / 9));
            mergedGoal.fats_goal = fats;
            mergedGoal.carbs_goal = Math.max(50, Math.round((mergedGoal.daily_calorie_goal - (mergedGoal.protein_goal * 4 + fats * 9)) / 4));
          }
        }

        setActiveGoal(mergedGoal);
        localStorage.setItem(userStorageKey, JSON.stringify(mergedGoal));
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(mergedGoal));
      } else if (metadataGoal) {
        setActiveGoal(metadataGoal);
        localStorage.setItem(userStorageKey, JSON.stringify(metadataGoal));
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(metadataGoal));
      } else if (localGoal) {
        setActiveGoal(localGoal as FitnessGoal);
      }

      // 2. Fetch latest body weight from body_metrics
      const { data: weightData, error: weightError } = await supabase
        .from('body_metrics')
        .select('weight, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (weightError && weightError.code !== 'PGRST116') {
        console.warn('Error fetching latest weight from Supabase:', weightError.message);
      } else if (weightData) {
        setLatestWeight(Number(weightData.weight));
      }
    } catch (err) {
      console.error('Failed to fetch fitness goal:', err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, []);

  useEffect(() => {
    fetchGoalData();
  }, [fetchGoalData]);

  // Update or insert a new goal
  const updateGoal = async (
    paramsOrType: GoalType | {
      goal_type: GoalType;
      target_weight: number;
      target_date: string;
      age?: number;
      biological_sex?: 'male' | 'female';
      height?: number;
      activity_level?: number;
      bmr?: number;
      tdee?: number;
      daily_calorie_goal?: number;
      protein_goal?: number;
      carbs_goal?: number;
      fats_goal?: number;
    },
    legacyTargetWeight?: number,
    legacyTargetDate?: string
  ) => {
    const params = typeof paramsOrType === 'string'
      ? {
          goal_type: paramsOrType,
          target_weight: legacyTargetWeight || 75.0,
          target_date: legacyTargetDate || new Date().toISOString().split('T')[0],
        }
      : paramsOrType;

    const currentW = latestWeight || activeGoal?.start_weight || 75.0;
    const nowIso = new Date().toISOString();

    const newGoal: FitnessGoal = {
      id: `goal_${Date.now()}`,
      user_id: 'local_user',
      goal_type: params.goal_type,
      start_weight: currentW,
      target_weight: params.target_weight,
      target_date: params.target_date,
      created_at: nowIso,
      age: params.age ?? activeGoal?.age ?? 22,
      biological_sex: params.biological_sex ?? activeGoal?.biological_sex ?? 'male',
      height: params.height ?? activeGoal?.height ?? 175,
      activity_level: params.activity_level ?? activeGoal?.activity_level ?? 1.55,
      bmr: params.bmr ?? activeGoal?.bmr,
      tdee: params.tdee ?? activeGoal?.tdee,
      daily_calorie_goal: params.daily_calorie_goal ?? activeGoal?.daily_calorie_goal ?? 2500,
      protein_goal: params.protein_goal ?? activeGoal?.protein_goal ?? 160,
      carbs_goal: params.carbs_goal ?? activeGoal?.carbs_goal ?? 260,
      fats_goal: params.fats_goal ?? activeGoal?.fats_goal ?? 70,
    };

    // Optimistic UI update
    setActiveGoal(newGoal);

    // Save to local storage immediately
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(newGoal));
    } catch (e) {
      console.error('Error saving fitness goal to local storage:', e);
    }

    if (isSupabaseConfigured) {
      try {
        const user = await getAuthUser();
        if (user) {
          newGoal.user_id = user.id;
          const userStorageKey = `gymtracker_fitness_goals_${user.id}`;
          try {
            localStorage.setItem(userStorageKey, JSON.stringify(newGoal));
            localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(newGoal));
          } catch {}

          // 1. Sync to Supabase Auth user_metadata:
          // This guarantees cloud persistence even without running the SQL migration!
          try {
            await supabase.auth.updateUser({
              data: {
                fitness_goals: newGoal,
              },
            });
          } catch (authErr) {
            console.warn('Failed to sync goal to user_metadata:', authErr);
          }

          // 2. Try saving to fitness_goals table
          const fullInsertPayload = {
            id: newGoal.id,
            user_id: user.id,
            goal_type: params.goal_type,
            start_weight: currentW,
            target_weight: params.target_weight,
            target_date: params.target_date,
            age: newGoal.age,
            biological_sex: newGoal.biological_sex,
            height: newGoal.height,
            activity_level: newGoal.activity_level,
            bmr: newGoal.bmr || null,
            tdee: newGoal.tdee || null,
            daily_calorie_goal: newGoal.daily_calorie_goal,
            protein_goal: newGoal.protein_goal,
            carbs_goal: newGoal.carbs_goal,
            fats_goal: newGoal.fats_goal,
          };

          const { data, error } = await supabase
            .from('fitness_goals').upsert(fullInsertPayload, { onConflict: 'id' })
            .select()
            .single();

          if (error) {
            console.warn('Initial insert with extended columns failed, falling back to core columns:', error.message);
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('fitness_goals')
              .upsert({
                id: newGoal.id,
                user_id: user.id,
                goal_type: params.goal_type,
                start_weight: currentW,
                target_weight: params.target_weight,
                target_date: params.target_date,
              }, { onConflict: 'id' })
              .select()
              .single();

            if (fallbackError) {
              console.error('Core goal insert also failed:', fallbackError.message);
            } else if (fallbackData) {
              const merged = { ...newGoal, ...fallbackData };
              setActiveGoal(merged);
              localStorage.setItem(userStorageKey, JSON.stringify(merged));
              localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(merged));
            }
          } else if (data) {
            const complete = data as FitnessGoal;
            setActiveGoal(complete);
            localStorage.setItem(userStorageKey, JSON.stringify(complete));
            localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(complete));
          }
        }
      } catch (err) {
        console.error('Supabase goal insert error:', err);
      }
    }
  };

  // Progress computations
  const { progressPercent, weightRemainingText, daysRemaining } = useMemo(() => {
    if (!activeGoal) {
      return { progressPercent: 0, weightRemainingText: '', daysRemaining: 0 };
    }

    const current = latestWeight !== null ? latestWeight : activeGoal.start_weight;
    const start = activeGoal.start_weight;
    const target = activeGoal.target_weight;
    const type = activeGoal.goal_type;

    // Calculate days remaining
    const targetDateObj = new Date(activeGoal.target_date);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const diffTime = targetDateObj.getTime() - todayObj.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let pct = 0;
    let text = '';

    if (type === 'Cutting') {
      const diff = current - target;
      if (diff <= 0) {
        pct = 100;
        text = 'Goal reached! 🎉';
      } else {
        const totalToLose = Math.max(0.1, start - target);
        const lost = Math.max(0, start - current);
        pct = Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));
        text = `${diff.toFixed(1)} kg to go`;
      }
    } else if (type === 'Bulking') {
      const diff = target - current;
      if (diff <= 0) {
        pct = 100;
        text = 'Goal reached! 🎉';
      } else {
        const totalToGain = Math.max(0.1, target - start);
        const gained = Math.max(0, current - start);
        pct = Math.min(100, Math.max(0, Math.round((gained / totalToGain) * 100)));
        text = `${diff.toFixed(1)} kg to go`;
      }
    } else {
      // Maintaining
      const diff = Math.abs(current - target);
      if (diff <= 0.5) {
        pct = 100;
        text = 'On target! (±0.5kg)';
      } else {
        pct = Math.min(100, Math.max(0, Math.round(Math.max(0, 1 - diff / 4) * 100)));
        text = `${diff.toFixed(1)} kg from target`;
      }
    }

    return {
      progressPercent: pct,
      weightRemainingText: text,
      daysRemaining: days,
    };
  }, [activeGoal, latestWeight]);

  return {
    activeGoal,
    latestWeight,
    isLoading,
    isRevalidating,
    progressPercent,
    weightRemainingText,
    daysRemaining,
    updateGoal,
    refreshGoal: fetchGoalData,
  };
}
