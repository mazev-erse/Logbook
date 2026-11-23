-- ============================================================================
-- MIGRATION: 20261011000004_admin_dashboard_and_security.sql
-- Admin Metrics RPC & Security Hardening
-- ============================================================================

-- 1. SECURE ADMIN DASHBOARD RPC
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
  -- Authenticated user validation
  caller_id := auth.uid();
  caller_email := auth.jwt()->>'email';

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Unauthenticated caller.';
  END IF;

  -- Enforce strict database-level admin authorization
  IF caller_email IS NULL OR lower(caller_email) NOT IN (
    'admin@example.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Caller (%) is not authorized as an administrator.', caller_email;
  END IF;

  -- Build aggregated platform metrics & user summaries
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

-- Grant execution to authenticated callers (internal guard enforces email)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;

-- 2. SECURITY HARDENING: REVOKE DIRECT EXECUTION OF AUTH TRIGGER FUNCTION
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 3. STORAGE HARDENING: RESTRICT AVATAR LISTING TO CALLER'S OWN FOLDER
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar files" ON storage.objects;

CREATE POLICY "Users can view their own avatar files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
