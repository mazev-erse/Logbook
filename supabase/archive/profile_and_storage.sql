-- ============================================================================
-- SUPABASE PROFILES & AVATAR STORAGE SETUP
-- ============================================================================

-- 1. CREATE PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- RLS: Anyone authenticated can view profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- RLS: Users can insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RLS: Users can only update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Revoke execute from public/anon/authenticated to prevent direct RPC execution
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 4. CREATE AVATARS STORAGE BUCKET (PUBLIC)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 5. STORAGE ROW LEVEL SECURITY POLICIES
-- Drop existing storage policies if re-running
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can view their own avatar files" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Allow authenticated users to view/list their own avatar files
create policy "Users can view their own avatar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to upload their own avatar to avatars/<userId>/...
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
