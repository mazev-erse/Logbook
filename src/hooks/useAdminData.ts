import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/ProtectedRoute';
import { isAdminUser } from '../utils/admin';
import type {
  AdminUserSummary,
  AdminMetrics,
  AdminAnalytics,
  SystemAnnouncement,
  AdminUserWorkout,
} from '../types/admin';
import type { ExerciseCategory, EquipmentType } from '../types/database';

const ANNOUNCEMENT_STORAGE_KEY = 'gymtracker_system_announcement';

export function useAdminData() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    total_users: 0,
    total_workouts: 0,
    total_diet_logs: 0,
    total_recovery_logs: 0,
    is_rpc_active: false,
    analytics: {
      active_7d: 0,
      active_30d: 0,
      avg_workouts_per_user: 0,
      top_exercises: [],
      empty_workouts_count: 0,
    },
  });
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(() => {
    try {
      const stored = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized = isAdminUser(user?.email);

  const fetchAdminData = useCallback(async () => {
    if (!isAuthorized || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Try invoking the secure get_admin_dashboard_data RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_dashboard_data');

      if (!rpcError && rpcData) {
        const parsedUsers: AdminUserSummary[] = (rpcData.users || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          bio: u.bio,
          height: u.height,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          workout_count: Number(u.workout_count) || 0,
          diet_count: Number(u.diet_count) || 0,
          recovery_count: Number(u.recovery_count) || 0,
        }));

        const totalUsers = Number(rpcData.total_users) || parsedUsers.length;
        const totalWorkouts = Number(rpcData.total_workouts) || 0;
        const avgWorkouts = totalUsers > 0 ? Number((totalWorkouts / totalUsers).toFixed(1)) : 0;

        const analytics: AdminAnalytics = {
          active_7d: Number(rpcData.active_7d) || 0,
          active_30d: Number(rpcData.active_30d) || 0,
          avg_workouts_per_user: avgWorkouts,
          top_exercises: Array.isArray(rpcData.top_exercises) ? rpcData.top_exercises : [],
          empty_workouts_count: Number(rpcData.empty_workouts_count) || 0,
        };

        setUsers(parsedUsers);
        setMetrics({
          total_users: totalUsers,
          total_workouts: totalWorkouts,
          total_diet_logs: Number(rpcData.total_diet_logs) || 0,
          total_recovery_logs: Number(rpcData.total_recovery_logs) || 0,
          is_rpc_active: true,
          analytics,
        });
        setIsLoading(false);
        return;
      }

      // 2. Graceful Fallback: Query public.profiles directly if RPC not yet installed in Supabase
      console.warn('Admin RPC not found or returned error, falling back to public.profiles:', rpcError?.message);

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profError) {
        throw profError;
      }

      const fallbackUsers: AdminUserSummary[] = (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.id === user?.id ? (user?.email ?? null) : null,
        display_name: p.display_name || 'Lifter',
        avatar_url: p.avatar_url,
        bio: p.bio,
        height: p.height,
        created_at: p.created_at || new Date().toISOString(),
        last_sign_in_at: null,
        workout_count: 0,
        diet_count: 0,
      }));

      setUsers(fallbackUsers);
      setMetrics({
        total_users: fallbackUsers.length,
        total_workouts: 0,
        total_diet_logs: 0,
        total_recovery_logs: 0,
        is_rpc_active: false,
        analytics: {
          active_7d: fallbackUsers.length,
          active_30d: fallbackUsers.length,
          avg_workouts_per_user: 0,
          top_exercises: [],
          empty_workouts_count: 0,
        },
      });
    } catch (err: any) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err?.message || 'Failed to fetch admin data.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, user]);

  // Load active announcement
  const fetchAnnouncement = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: annError } = await supabase
        .from('system_announcements')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!annError && data) {
        setAnnouncement(data as SystemAnnouncement);
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Ignore if table not yet created
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    fetchAnnouncement();
  }, [fetchAdminData, fetchAnnouncement]);

  // 1. ANNOUNCEMENTS: Save or update platform announcement
  const saveAnnouncement = async (item: Partial<SystemAnnouncement>) => {
    const updated: SystemAnnouncement = {
      title: item.title ?? 'System Notice',
      message: item.message ?? '',
      type: item.type ?? 'info',
      is_active: item.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    setAnnouncement(updated);
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        if (announcement?.id) {
          await supabase
            .from('system_announcements')
            .update(updated)
            .eq('id', announcement.id);
        } else {
          const { data } = await supabase
            .from('system_announcements')
            .insert(updated)
            .select()
            .single();
          if (data) {
            setAnnouncement(data as SystemAnnouncement);
            localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn('Could not sync announcement to Supabase:', err);
      }
    }
  };

  // 2. USER MODERATION: Fetch recent workouts for a specific user
  const fetchUserWorkouts = useCallback(async (userId: string): Promise<AdminUserWorkout[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_get_user_workouts', {
        target_user_id: userId,
      });

      if (!rpcErr && rpcData) {
        return rpcData as AdminUserWorkout[];
      }

      // Fallback query
      const { data: directData, error: dirErr } = await supabase
        .from('workouts')
        .select('id, name, started_at, completed_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (!dirErr && directData) {
        return directData.map((w: any) => ({
          id: w.id,
          name: w.name,
          started_at: w.started_at,
          completed_at: w.completed_at,
          exercise_names: [],
          total_sets: 0,
        }));
      }
    } catch (e) {
      console.error('Error fetching user workouts:', e);
    }
    return [];
  }, []);

  // 2. USER MODERATION: Send password reset email
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !email) {
      return { success: false, error: 'Email or database not configured.' };
    }
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetErr) throw resetErr;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send password reset.' };
    }
  };

  // 2. USER MODERATION: Purge / Delete user account
  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !userId) {
      return { success: false, error: 'Target user not found.' };
    }
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
      });

      if (rpcErr) {
        // Fallback: delete from public.profiles
        const { error: profDelErr } = await supabase.from('profiles').delete().eq('id', userId);
        if (profDelErr) throw profDelErr;
      }

      // Update state locally
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMetrics((prev) => ({
        ...prev,
        total_users: Math.max(0, prev.total_users - 1),
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete user.' };
    }
  };

  // 3. CATALOG: Add global exercise
  const addGlobalExercise = async (
    name: string,
    category: ExerciseCategory,
    equipment: EquipmentType,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error: insErr } = await supabase.from('exercises').insert({
        user_id: null, // explicitly null for global exercise
        name: name.trim(),
        category,
        equipment,
        notes: notes?.trim() || null,
      });

      if (insErr) throw insErr;
      localStorage.removeItem('gymtracker_exercises_cache');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add global exercise.' };
    }
  };

  // 3. CATALOG: Delete global exercise
  const deleteGlobalExercise = async (exerciseId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error: delErr } = await supabase.from('exercises').delete().eq('id', exerciseId);
      if (delErr) throw delErr;
      localStorage.removeItem('gymtracker_exercises_cache');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete exercise.' };
    }
  };

  // 3. CATALOG: Add official system routine template
  const addSystemRoutine = async (
    name: string,
    description: string,
    exercisesList: { name: string; sets: number; reps: number }[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { data: routineData, error: routineErr } = await supabase
        .from('routines')
        .insert({
          user_id: null,
          name: name.trim(),
          description: description.trim(),
          is_system_template: true,
        })
        .select()
        .single();

      if (routineErr) throw routineErr;

      if (routineData && exercisesList.length > 0) {
        const rows = exercisesList.map((ex, idx) => ({
          routine_id: routineData.id,
          exercise_name: ex.name,
          sequence_order: idx + 1,
          target_sets: ex.sets || 3,
          target_reps: ex.reps || 10,
        }));
        await supabase.from('routine_exercises').insert(rows);
      }

      localStorage.removeItem('gymtracker_routines_v1');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create system routine.' };
    }
  };

  // 3. CATALOG: Delete official system routine
  const deleteSystemRoutine = async (routineId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error: delErr } = await supabase.from('routines').delete().eq('id', routineId);
      if (delErr) throw delErr;
      localStorage.removeItem('gymtracker_routines_v1');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete routine.' };
    }
  };

  // 5. HYGIENE: Clean up empty workouts
  const cleanupEmptyWorkouts = async (): Promise<{ cleanedCount: number; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { cleanedCount: 0, error: 'Supabase is not configured.' };
    }
    try {
      const { data: rpcCount, error: rpcErr } = await supabase.rpc('admin_cleanup_empty_workouts');
      if (!rpcErr && typeof rpcCount === 'number') {
        fetchAdminData();
        return { cleanedCount: rpcCount };
      }

      // Fallback: delete workouts with null completed_at that are older than 24h
      const { data: deleted, error: delErr } = await supabase
        .from('workouts')
        .delete()
        .is('completed_at', null)
        .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .select('id');

      if (delErr) throw delErr;
      const count = deleted?.length || 0;
      fetchAdminData();
      return { cleanedCount: count };
    } catch (err: any) {
      return { cleanedCount: 0, error: err.message || 'Failed to cleanup workouts.' };
    }
  };

  // Export User Directory to CSV
  const exportUsersCsv = useCallback(() => {
    if (users.length === 0) return;

    const headers = [
      'User ID',
      'Email',
      'Display Name',
      'Height (cm)',
      'Total Workouts',
      'Total Diet Logs',
      'Signed Up At',
      'Last Sign In',
    ];

    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.email || 'N/A'}"`,
      `"${(u.display_name || '').replace(/"/g, '""')}"`,
      `"${u.height || ''}"`,
      `"${u.workout_count || 0}"`,
      `"${u.diet_count || 0}"`,
      `"${new Date(u.created_at).toLocaleString()}"`,
      `"${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gymtracker_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [users]);

  return {
    isAuthorized,
    users,
    metrics,
    announcement,
    isLoading,
    error,
    refresh: fetchAdminData,
    exportUsersCsv,
    saveAnnouncement,
    fetchUserWorkouts,
    sendPasswordReset,
    deleteUser,
    addGlobalExercise,
    deleteGlobalExercise,
    addSystemRoutine,
    deleteSystemRoutine,
    cleanupEmptyWorkouts,
  };
}
