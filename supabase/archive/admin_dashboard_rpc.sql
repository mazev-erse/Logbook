-- ============================================================================
-- SECURE ADMIN DASHBOARD RPC FOR SUPABASE
-- Allows authorized admin email(s) to fetch unified platform metrics and user list
-- ============================================================================

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
  -- 1. Get the authenticated user's ID and Email from the JWT token
  caller_id := auth.uid();
  caller_email := auth.jwt()->>'email';

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Unauthenticated caller.';
  END IF;

  -- 2. Enforce strict Database-Level Authorization (Prevents unauthorized authenticated users from reading auth.users)
  IF caller_email IS NULL OR lower(caller_email) NOT IN (
    'admin@example.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Caller (%) is not authorized as an administrator.', caller_email;
  END IF;

  -- 2. Build aggregated metrics & unified user accounts JSON
  SELECT json_build_object(
    'total_users', COALESCE((SELECT COUNT(*) FROM auth.users), 0),
    'total_workouts', COALESCE((SELECT COUNT(*) FROM public.workouts), 0),
    'total_diet_logs', COALESCE((SELECT COUNT(*) FROM public.diet_logs), 0),
    'total_recovery_logs', COALESCE((SELECT COUNT(*) FROM public.active_recovery_logs), 0),
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
          'diet_count', COALESCE((SELECT COUNT(*) FROM public.diet_logs d WHERE d.user_id = u.id), 0)
        ) ORDER BY u.created_at DESC
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON u.id = p.id
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;
