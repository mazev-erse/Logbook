-- ============================================================================
-- SUPABASE STORAGE BUCKET HARDENING (AVATARS)
-- Run this in your Supabase SQL Editor to enforce strict MIME types & 8MB size limit.
-- ============================================================================

-- 1. BUCKET-LEVEL HARDENING (Native Storage Engine Enforcement)
-- Restricts maximum single file size to 8MB (8,388,608 bytes)
-- Strictly limits allowed MIME types to JPEG, PNG, and WebP
UPDATE storage.buckets
SET 
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

-- 2. ROW-LEVEL SECURITY (RLS) HARDENING ON storage.objects
-- Ensures users can only write to their own user-id folder, and only with permitted file extensions
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );
