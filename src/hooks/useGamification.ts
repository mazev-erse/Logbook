import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/ProtectedRoute';
import type { Badge, UserBadge, ExerciseRanking } from '../types/database';
import { calculateDynamicStreak } from '../utils/streakProtection';

export interface BadgeWithStatus extends Badge {
  isUnlocked: boolean;
  awardedAt?: string;
  metadata?: Record<string, any>;
}

export const PRESET_BADGES: Badge[] = [
  {
    id: 'badge-30-day-streak',
    slug: '30-day-streak',
    name: '30-Day Streak',
    description: 'Conquered the gym for 30 consecutive workout days. Elite consistency.',
    icon: 'flame',
    tier: 'gold',
    category: 'streak',
    created_at: new Date().toISOString(),
  },
  {
    id: 'badge-new-pr',
    slug: 'new-pr',
    name: 'New PR',
    description: 'Surpassed your previous all-time personal record on an exercise. Progressive overload unlocked.',
    icon: 'trophy',
    tier: 'gold',
    category: 'strength',
    created_at: new Date().toISOString(),
  },
  {
    id: 'badge-100kg-club',
    slug: '100kg-club',
    name: '100kg Club',
    description: 'Pulled 100kg or more on the Deadlift. Welcome to the triple-digit heavy lifters club.',
    icon: 'crown',
    tier: 'platinum',
    category: 'strength',
    created_at: new Date().toISOString(),
  },
  {
    id: 'badge-7-day-streak',
    slug: '7-day-streak',
    name: '7-Day Warrior',
    description: 'Crushed workouts for 7 consecutive days without skipping a beat.',
    icon: 'flame',
    tier: 'silver',
    category: 'streak',
    created_at: new Date().toISOString(),
  },
  {
    id: 'badge-first-workout',
    slug: 'first-workout',
    name: 'First Step',
    description: 'Completed your first recorded workout session.',
    icon: 'award',
    tier: 'bronze',
    category: 'milestone',
    created_at: new Date().toISOString(),
  },
  {
    id: 'badge-tonnage-titan',
    slug: 'tonnage-titan',
    name: 'Tonnage Titan',
    description: 'Lifted over 10,000kg in cumulative volume in a single training session.',
    icon: 'zap',
    tier: 'gold',
    category: 'volume',
    created_at: new Date().toISOString(),
  },
];

/**
 * Calculates consecutive active days from an array of date strings
 * respecting the 36-hour grace period window.
 */
export function calculateStreak(timestamps: string[]): number {
  if (!timestamps.length) return 0;
  const sessions = timestamps.map((t) => ({ startedAt: t }));
  return calculateDynamicStreak(sessions).streakDays;
}

export function useGamification() {
  const { user } = useAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>(PRESET_BADGES);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Local storage key for offline badge fallback
  const getStorageKey = useCallback(() => {
    return user ? `gymtracker_user_badges_${user.id}` : 'gymtracker_user_badges_anon';
  }, [user]);

  /**
   * Evaluates workout history client-side for streak, PRs, 100kg deadlift, etc.
   */
  const evaluateLocalMilestones = useCallback((existingBadges: UserBadge[]): UserBadge[] => {
    try {
      const rawWorkouts = localStorage.getItem('gymtracker_completed_workouts');
      if (!rawWorkouts) return existingBadges;

      const sessions: any[] = JSON.parse(rawWorkouts);
      if (!Array.isArray(sessions) || sessions.length === 0) return existingBadges;

      const earnedMap = new Map<string, UserBadge>();
      existingBadges.forEach((b) => {
        const badgeSlug = b.badge?.slug || b.badge_id;
        earnedMap.set(badgeSlug, b);
      });

      // 1. First Step Check
      if (sessions.length >= 1 && !earnedMap.has('first-workout')) {
        earnedMap.set('first-workout', {
          id: 'local-first-workout',
          user_id: user?.id || 'anon',
          badge_id: 'badge-first-workout',
          awarded_at: sessions[sessions.length - 1].endTime || new Date().toISOString(),
          metadata: { workouts_count: sessions.length },
          badge: PRESET_BADGES.find((b) => b.slug === 'first-workout'),
        });
      }

      // 2. Streak Check
      const timestamps = sessions.map((s) => s.endTime || s.startTime).filter(Boolean);
      const streak = calculateStreak(timestamps);

      if (streak >= 7 && !earnedMap.has('7-day-streak')) {
        earnedMap.set('7-day-streak', {
          id: 'local-7-day-streak',
          user_id: user?.id || 'anon',
          badge_id: 'badge-7-day-streak',
          awarded_at: new Date().toISOString(),
          metadata: { streak_days: streak },
          badge: PRESET_BADGES.find((b) => b.slug === '7-day-streak'),
        });
      }

      if (streak >= 30 && !earnedMap.has('30-day-streak')) {
        earnedMap.set('30-day-streak', {
          id: 'local-30-day-streak',
          user_id: user?.id || 'anon',
          badge_id: 'badge-30-day-streak',
          awarded_at: new Date().toISOString(),
          metadata: { streak_days: streak },
          badge: PRESET_BADGES.find((b) => b.slug === '30-day-streak'),
        });
      }

      // 3. PR, 100kg Deadlift & Tonnage Titan Check
      let maxTonnage = 0;
      let has100kgDeadlift = false;
      let deadliftWeight = 0;
      let hasHitPR = false;

      // Track max weight per exercise historically to detect PRs
      const exerciseMaxMap = new Map<string, number>();

      // Sort sessions chronologically (oldest to newest) to detect true progressive PRs
      const chrono = sessions.filter((s) => s && typeof s === 'object').sort(
        (a, b) => new Date(a.startedAt || a.startTime || 0).getTime() - new Date(b.startedAt || b.startTime || 0).getTime()
      );

      for (const session of chrono) {
        let sessionTonnage = 0;

        for (const ex of session.exercises || []) {
          if (!ex || typeof ex !== 'object') continue;
          const exName = (ex.exerciseName || ex.exercise?.name || '').trim();
          const isDeadlift = exName.toLowerCase().includes('deadlift');

          for (const s of ex.sets || []) {
            if (!s || typeof s !== 'object') continue;
            const w = Number(s.weight) || 0;
            const r = Number(s.reps) || 0;
            if (s.isCompleted || w > 0) {
              sessionTonnage += w * r;

              if (isDeadlift && w >= 100) {
                has100kgDeadlift = true;
                if (w > deadliftWeight) deadliftWeight = w;
              }

              const prevMax = exerciseMaxMap.get(exName) || 0;
              if (w > prevMax && prevMax > 0) {
                hasHitPR = true;
              }
              if (w > prevMax) {
                exerciseMaxMap.set(exName, w);
              }
            }
          }
        }

        if (sessionTonnage > maxTonnage) {
          maxTonnage = sessionTonnage;
        }
      }

      // 100kg Club
      if (has100kgDeadlift && !earnedMap.has('100kg-club')) {
        earnedMap.set('100kg-club', {
          id: 'local-100kg-club',
          user_id: user?.id || 'anon',
          badge_id: 'badge-100kg-club',
          awarded_at: new Date().toISOString(),
          metadata: { exercise_name: 'Deadlift', weight: deadliftWeight },
          badge: PRESET_BADGES.find((b) => b.slug === '100kg-club'),
        });
      }

      // New PR
      if (hasHitPR && !earnedMap.has('new-pr')) {
        earnedMap.set('new-pr', {
          id: 'local-new-pr',
          user_id: user?.id || 'anon',
          badge_id: 'badge-new-pr',
          awarded_at: new Date().toISOString(),
          metadata: { pr_achieved: true },
          badge: PRESET_BADGES.find((b) => b.slug === 'new-pr'),
        });
      }

      // Tonnage Titan (10,000kg+)
      if (maxTonnage >= 10000 && !earnedMap.has('tonnage-titan')) {
        earnedMap.set('tonnage-titan', {
          id: 'local-tonnage-titan',
          user_id: user?.id || 'anon',
          badge_id: 'badge-tonnage-titan',
          awarded_at: new Date().toISOString(),
          metadata: { tonnage_kg: Math.round(maxTonnage) },
          badge: PRESET_BADGES.find((b) => b.slug === 'tonnage-titan'),
        });
      }

      return Array.from(earnedMap.values());
    } catch (err) {
      console.error('Error evaluating local milestones:', err);
      return existingBadges;
    }
  }, [user]);

  /**
   * Fetch badges from Supabase or fallback to presets & local evaluations
   */
  const fetchBadges = useCallback(async () => {
    setIsLoading(true);
    let badgesList = PRESET_BADGES;
    let earnedBadges: UserBadge[] = [];

    // 1. Try reading cached user badges from localStorage
    try {
      const cached = localStorage.getItem(getStorageKey());
      if (cached) {
        earnedBadges = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Could not read cached user badges:', e);
    }

    // 2. Query Supabase if configured
    if (isSupabaseConfigured && user) {
      try {
        // Query badges definition
        const { data: bData, error: bErr } = await supabase
          .from('badges')
          .select('*')
          .order('created_at', { ascending: true });

        if (!bErr && bData && bData.length > 0) {
          badgesList = bData as Badge[];
          setAllBadges(badgesList);
        }

        // Query user_badges joined with badges
        const { data: ubData, error: ubErr } = await supabase
          .from('user_badges')
          .select('id, user_id, badge_id, awarded_at, metadata, badges (*)')
          .eq('user_id', user.id);

        if (!ubErr && ubData) {
          const mapped: UserBadge[] = ubData.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            badge_id: row.badge_id,
            awarded_at: row.awarded_at,
            metadata: row.metadata,
            badge: row.badges,
          }));
          earnedBadges = mapped;
        }
      } catch (err) {
        console.warn('Supabase badges query encountered issue, falling back:', err);
      }
    }

    // 3. Enrich with client-side milestone evaluation
    const evaluated = evaluateLocalMilestones(earnedBadges);
    setUserBadges(evaluated);

    // 4. Cache to localStorage
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(evaluated));
    } catch (e) {
      console.warn('Could not cache user badges:', e);
    }

    // 5. Try syncing newly evaluated badges to Supabase if table exists
    if (isSupabaseConfigured && user) {
      for (const eb of evaluated) {
        if (eb.badge?.slug && !eb.id.startsWith('local-')) continue;
        const matchedBadge = badgesList.find((b) => b.slug === eb.badge?.slug || b.id === eb.badge_id);
        if (matchedBadge) {
          supabase
            .from('user_badges')
            .upsert(
              {
                user_id: user.id,
                badge_id: matchedBadge.id,
                metadata: eb.metadata || {},
                awarded_at: eb.awarded_at || new Date().toISOString(),
              },
              { onConflict: 'user_id, badge_id' }
            )
            .then(({ error }) => {
              if (error) console.log('Notice: user_badges sync:', error.message);
            });
        }
      }
    }

    setIsLoading(false);
  }, [user, getStorageKey, evaluateLocalMilestones]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  /**
   * Merges all available badges with the user's unlocked status
   */
  const badgesWithStatus: BadgeWithStatus[] = allBadges.map((badge) => {
    const earned = userBadges.find(
      (ub) => ub.badge_id === badge.id || ub.badge?.slug === badge.slug
    );

    return {
      ...badge,
      isUnlocked: Boolean(earned),
      awardedAt: earned?.awarded_at,
      metadata: earned?.metadata,
    };
  });

  const unlockedCount = badgesWithStatus.filter((b) => b.isUnlocked).length;
  const totalCount = badgesWithStatus.length;

  /**
   * Queries or computes top 5 performances for an exercise (Leaderboard)
   */
  const fetchExerciseRankings = useCallback(
    async (exerciseName: string): Promise<ExerciseRanking[]> => {
      if (!exerciseName) return [];

      // 1. Try querying Supabase exercise_rankings SQL view
      if (isSupabaseConfigured && user) {
        try {
          const { data, error } = await supabase
            .from('exercise_rankings')
            .select('*')
            .eq('user_id', user.id)
            .ilike('exercise_name', `%${exerciseName}%`)
            .order('performance_rank', { ascending: true })
            .limit(5);

          if (!error && data && data.length > 0) {
            return data as ExerciseRanking[];
          }
        } catch (e) {
          console.warn('exercise_rankings query fallback:', e);
        }
      }

      // 2. Client-side computation fallback from workout history
      try {
        const raw = localStorage.getItem('gymtracker_completed_workouts');
        if (!raw) return [];
        const sessions: any[] = JSON.parse(raw);

        const matchingSets: {
          setId: string;
          workoutId: string;
          workoutName: string;
          performedAt: string;
          weight: number;
          reps: number;
          estimated1RM: number;
        }[] = [];

        sessions.forEach((s) => {
          (s.exercises || []).forEach((ex: any) => {
            const name = (ex.exerciseName || '').trim().toLowerCase();
            if (name === exerciseName.trim().toLowerCase() || name.includes(exerciseName.trim().toLowerCase())) {
              (ex.sets || []).forEach((st: any, idx: number) => {
                const w = Number(st.weight) || 0;
                const r = Number(st.reps) || 0;
                if ((st.isCompleted || w > 0) && w > 0 && r > 0) {
                  // Epley Formula: Weight * (1 + Reps / 30)
                  const est1RM = Math.round(w * (1 + r / 30.0) * 10) / 10;
                  matchingSets.push({
                    setId: st.id || `set-${s.id}-${idx}`,
                    workoutId: s.id,
                    workoutName: s.name || 'Workout',
                    performedAt: s.endTime || s.startTime || new Date().toISOString(),
                    weight: w,
                    reps: r,
                    estimated1RM: est1RM,
                  });
                }
              });
            }
          });
        });

        // Sort descending by 1RM, then weight, then reps
        matchingSets.sort((a, b) => {
          if (b.estimated1RM !== a.estimated1RM) {
            return b.estimated1RM - a.estimated1RM;
          }
          if (b.weight !== a.weight) {
            return b.weight - a.weight;
          }
          return b.reps - a.reps;
        });

        // Top 5 with performance rank
        const top5 = matchingSets.slice(0, 5).map((item, idx) => ({
          set_id: item.setId,
          user_id: user?.id || 'anon',
          exercise_id: exerciseName,
          exercise_name: exerciseName,
          workout_id: item.workoutId,
          workout_name: item.workoutName,
          performed_at: item.performedAt,
          weight: item.weight,
          reps: item.reps,
          estimated_1rm: item.estimated1RM,
          performance_rank: idx + 1,
        }));

        return top5;
      } catch (err) {
        console.error('Failed to compute exercise rankings client-side:', err);
        return [];
      }
    },
    [user]
  );

  return {
    badges: badgesWithStatus,
    unlockedCount,
    totalCount,
    isLoading,
    fetchExerciseRankings,
    refreshGamification: fetchBadges,
  };
}
