-- ============================================================================
-- SUPABASE SECURITY ADVISOR FIXES
-- Run this in your Supabase SQL Editor to resolve the Security Advisor warnings.
-- ============================================================================

-- 1. FIX: "Public Can Execute SECURITY DEFINER" & "Signed-In Users Can Execute SECURITY DEFINER"
-- Revoke direct execution rights from public, anon, and authenticated roles.
-- The trigger 'on_auth_user_created' runs automatically with elevated database permissions on signup,
-- so users do not need (and should not have) direct RPC execution access to handle_new_user().

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 2. FIX: "Public Bucket Allows Listing" on storage.avatars
-- Drop the unrestricted SELECT policy that allowed anyone to list all avatar files in the bucket.
-- Since the 'avatars' bucket is already public (public = true), public image URLs (/storage/v1/object/public/avatars/...)
-- remain fully viewable without needing an unrestricted SELECT policy on storage.objects.
-- This restricts object listing to authenticated users for their own files only.

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar files" ON storage.objects;

CREATE POLICY "Users can view their own avatar files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
