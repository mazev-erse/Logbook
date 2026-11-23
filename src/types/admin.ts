export interface AdminUserSummary {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  height?: number | null;
  created_at: string;
  last_sign_in_at?: string | null;
  workout_count?: number;
  diet_count?: number;
  recovery_count?: number;
}

export interface AdminAnalytics {
  active_7d: number;
  active_30d: number;
  avg_workouts_per_user: number;
  top_exercises: { name: string; count: number }[];
  empty_workouts_count: number;
}

export interface AdminMetrics {
  total_users: number;
  total_workouts: number;
  total_diet_logs: number;
  total_recovery_logs: number;
  is_rpc_active: boolean;
  analytics?: AdminAnalytics;
}

export interface SystemAnnouncement {
  id?: string;
  title?: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  is_active: boolean;
  updated_at?: string;
}

export interface AdminUserWorkout {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
  exercise_names: string[];
  total_sets: number;
}
