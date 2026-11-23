-- ============================================================================
-- SCHEMA: 08_admin_dashboard_rpc.sql
-- Domain: Superadmin Metrics RPC with Hardened Database-Level Authorization
-- NOTE: Replace 'admin@example.com' with your actual administrator email before deployment.
-- ============================================================================

-- 1. SYSTEM ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active announcements" ON public.system_announcements;
CREATE POLICY "Public can view active announcements"
  ON public.system_announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.system_announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.system_announcements FOR ALL
  TO authenticated
  USING (lower(auth.jwt()->>'email') IN ('admin@example.com'))
  WITH CHECK (lower(auth.jwt()->>'email') IN ('admin@example.com'));

-- 2. POLICIES: ADMIN GLOBAL EXERCISE & ROUTINE MANAGEMENT
DROP POLICY IF EXISTS "Admins can manage global exercises" ON public.exercises;
CREATE POLICY "Admins can manage global exercises"
  ON public.exercises FOR ALL
  TO authenticated
  USING (lower(auth.jwt()->>'email') IN ('admin@example.com'))
  WITH CHECK (lower(auth.jwt()->>'email') IN ('admin@example.com'));

DROP POLICY IF EXISTS "Admins can manage system routine templates" ON public.routines;
CREATE POLICY "Admins can manage system routine templates"
  ON public.routines FOR ALL
  TO authenticated
  USING (lower(auth.jwt()->>'email') IN ('admin@example.com'))
  WITH CHECK (lower(auth.jwt()->>'email') IN ('admin@example.com'));

-- 3. GET ADMIN DASHBOARD DATA
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  caller_id uuid;
  result json;
BEGIN
  -- Validate caller is authenticated
  caller_id := auth.uid();
  caller_email := auth.jwt()->>'email';

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Unauthenticated caller.';
  END IF;

  -- Enforce strict database-level admin authorization check
  IF caller_email IS NULL OR lower(caller_email) NOT IN (
    'admin@example.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Caller (%) is not authorized as an administrator.', caller_email;
  END IF;

  -- Build aggregated platform metrics & user summaries JSON
  SELECT json_build_object(
    'total_users', COALESCE((SELECT COUNT(*) FROM auth.users), 0),
    'total_workouts', COALESCE((SELECT COUNT(*) FROM public.workouts), 0),
    'total_diet_logs', COALESCE((SELECT COUNT(*) FROM public.diet_logs), 0),
    'total_recovery_logs', COALESCE((SELECT COUNT(*) FROM public.active_recovery_logs), 0),
    'active_7d', COALESCE((
      SELECT COUNT(DISTINCT u.id)
      FROM auth.users u
      WHERE u.last_sign_in_at >= now() - interval '7 days'
         OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.user_id = u.id AND w.started_at >= now() - interval '7 days')
    ), 0),
    'active_30d', COALESCE((
      SELECT COUNT(DISTINCT u.id)
      FROM auth.users u
      WHERE u.last_sign_in_at >= now() - interval '30 days'
         OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.user_id = u.id AND w.started_at >= now() - interval '30 days')
    ), 0),
    'empty_workouts_count', COALESCE((
      SELECT COUNT(*)
      FROM public.workouts w
      WHERE NOT EXISTS (
        SELECT 1 FROM public.workout_sets s
        WHERE s.workout_id = w.id AND s.is_completed = true
      )
    ), 0),
    'top_exercises', COALESCE((
      SELECT json_agg(top_row)
      FROM (
        SELECT e.name, COUNT(ws.id)::int as count
        FROM public.workout_sets ws
        JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
        JOIN public.exercises e ON e.id = we.exercise_id
        WHERE ws.is_completed = true
        GROUP BY e.name
        ORDER BY count DESC
        LIMIT 5
      ) top_row
    ), '[]'::json),
    'users', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', u.id,
          'email', u.email,
          'created_at', u.created_at,
          'last_sign_in_at', u.last_sign_in_at,
          'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
          'avatar_url', p.avatar_url,
          'bio', p.bio,
          'height', p.height,
          'workout_count', COALESCE((SELECT COUNT(*) FROM public.workouts w WHERE w.user_id = u.id), 0),
          'diet_count', COALESCE((SELECT COUNT(*) FROM public.diet_logs d WHERE d.user_id = u.id), 0),
          'recovery_count', COALESCE((SELECT COUNT(*) FROM public.active_recovery_logs r WHERE r.user_id = u.id), 0)
        ) ORDER BY u.created_at DESC
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- 4. ADMIN USER WORKOUTS INSPECTION RPC
CREATE OR REPLACE FUNCTION public.admin_get_user_workouts(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  result json;
BEGIN
  caller_email := auth.jwt()->>'email';
  IF caller_email IS NULL OR lower(caller_email) NOT IN ('admin@example.com') THEN
    RAISE EXCEPTION 'Access Denied: Admin authorization required.';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', w.id,
      'name', w.name,
      'started_at', w.started_at,
      'completed_at', w.completed_at,
      'exercise_names', COALESCE((
        SELECT json_agg(e.name ORDER BY we.order_index)
        FROM public.workout_exercises we
        JOIN public.exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = w.id
      ), '[]'::json),
      'total_sets', COALESCE((
        SELECT COUNT(*)
        FROM public.workout_sets ws
        WHERE ws.workout_id = w.id AND ws.is_completed = true
      ), 0)
    ) ORDER BY w.started_at DESC
  ) INTO result
  FROM (
    SELECT id, name, started_at, completed_at
    FROM public.workouts
    WHERE user_id = target_user_id
    ORDER BY started_at DESC
    LIMIT 10
  ) w;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 5. ADMIN PURGE USER RPC
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
BEGIN
  caller_email := auth.jwt()->>'email';
  IF caller_email IS NULL OR lower(caller_email) NOT IN ('admin@example.com') THEN
    RAISE EXCEPTION 'Access Denied: Admin authorization required.';
  END IF;

  IF lower((SELECT email FROM auth.users WHERE id = target_user_id)) = lower(caller_email) THEN
    RAISE EXCEPTION 'Action Denied: You cannot delete your own administrator account.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
  RETURN true;
END;
$$;

-- 6. ADMIN CLEANUP EMPTY WORKOUTS RPC
CREATE OR REPLACE FUNCTION public.admin_cleanup_empty_workouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  deleted_count integer;
BEGIN
  caller_email := auth.jwt()->>'email';
  IF caller_email IS NULL OR lower(caller_email) NOT IN ('admin@example.com') THEN
    RAISE EXCEPTION 'Access Denied: Admin authorization required.';
  END IF;

  WITH deleted AS (
    DELETE FROM public.workouts w
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workout_sets s
      WHERE s.workout_id = w.id AND s.is_completed = true
    )
    RETURNING w.id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_workouts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_empty_workouts() TO authenticated;
