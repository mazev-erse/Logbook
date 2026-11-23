-- ============================================================================
-- PART 1: CORE WORKOUT SCHEMA & RLS POLICIES
-- ============================================================================

-- 1. EXTENSIONS & ENUMS
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.exercise_category as enum (
    'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'olympic', 'cardio', 'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.equipment_type as enum (
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'smith_machine', 'band', 'other'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. TABLES
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category public.exercise_category not null default 'other',
  equipment public.equipment_type not null default 'other',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null default 'Workout',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete restrict not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  order_index integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid references public.workout_exercises(id) on delete cascade not null,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  set_number integer not null default 1,
  weight numeric(6, 2) default 0.00,
  reps integer default 0,
  rpe numeric(3, 1),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. INDEXES
create index if not exists idx_exercises_user on public.exercises(user_id);
create index if not exists idx_workouts_user_started on public.workouts(user_id, started_at desc);
create index if not exists idx_workout_exercises_workout on public.workout_exercises(workout_id, order_index);
create index if not exists idx_workout_sets_exercise on public.workout_sets(workout_exercise_id, set_number);
create index if not exists idx_workout_sets_user on public.workout_sets(user_id, is_completed);

-- 4. RLS POLICIES
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

-- Exercises
drop policy if exists "Users can view default and own exercises" on public.exercises;
drop policy if exists "Users can insert own exercises" on public.exercises;
drop policy if exists "Users can update own exercises" on public.exercises;
drop policy if exists "Users can delete own exercises" on public.exercises;

create policy "Users can view default and own exercises"
  on public.exercises for select using (user_id is null or user_id = auth.uid());
create policy "Users can insert own exercises"
  on public.exercises for insert with check (user_id = auth.uid());
create policy "Users can update own exercises"
  on public.exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own exercises"
  on public.exercises for delete using (user_id = auth.uid());

-- Workouts
drop policy if exists "Users can view own workouts" on public.workouts;
drop policy if exists "Users can create own workouts" on public.workouts;
drop policy if exists "Users can update own workouts" on public.workouts;
drop policy if exists "Users can delete own workouts" on public.workouts;

create policy "Users can view own workouts"
  on public.workouts for select using (user_id = auth.uid());
create policy "Users can create own workouts"
  on public.workouts for insert with check (user_id = auth.uid());
create policy "Users can update own workouts"
  on public.workouts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own workouts"
  on public.workouts for delete using (user_id = auth.uid());

-- Workout Exercises
drop policy if exists "Users can view own workout exercises" on public.workout_exercises;
drop policy if exists "Users can insert own workout exercises" on public.workout_exercises;
drop policy if exists "Users can update own workout exercises" on public.workout_exercises;
drop policy if exists "Users can delete own workout exercises" on public.workout_exercises;

create policy "Users can view own workout exercises"
  on public.workout_exercises for select using (user_id = auth.uid());
create policy "Users can insert own workout exercises"
  on public.workout_exercises for insert with check (user_id = auth.uid());
create policy "Users can update own workout exercises"
  on public.workout_exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own workout exercises"
  on public.workout_exercises for delete using (user_id = auth.uid());

-- Workout Sets
drop policy if exists "Users can view own workout sets" on public.workout_sets;
drop policy if exists "Users can insert own workout sets" on public.workout_sets;
drop policy if exists "Users can update own workout sets" on public.workout_sets;
drop policy if exists "Users can delete own workout sets" on public.workout_sets;

create policy "Users can view own workout sets"
  on public.workout_sets for select using (user_id = auth.uid());
create policy "Users can insert own workout sets"
  on public.workout_sets for insert with check (user_id = auth.uid());
create policy "Users can update own workout sets"
  on public.workout_sets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own workout sets"
  on public.workout_sets for delete using (user_id = auth.uid());

-- 5. SEED DATA (20 ESSENTIAL EXERCISES)
insert into public.exercises (name, category, equipment) values
  ('Barbell Bench Press', 'chest', 'barbell'),
  ('Incline Dumbbell Press', 'chest', 'dumbbell'),
  ('Cable Chest Fly', 'chest', 'cable'),
  ('Push Up', 'chest', 'bodyweight'),
  ('Barbell Squat', 'legs', 'barbell'),
  ('Leg Press', 'legs', 'machine'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Standing Calf Raise', 'legs', 'machine'),
  ('Deadlift', 'back', 'barbell'),
  ('Barbell Bent-Over Row', 'back', 'barbell'),
  ('Lat Pulldown', 'back', 'cable'),
  ('Seated Cable Row', 'back', 'cable'),
  ('Pull Up', 'back', 'bodyweight'),
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Dumbbell Lateral Raise', 'shoulders', 'dumbbell'),
  ('Face Pull', 'shoulders', 'cable'),
  ('Barbell Bicep Curl', 'arms', 'barbell'),
  ('Dumbbell Hammer Curl', 'arms', 'dumbbell'),
  ('Tricep Rope Pushdown', 'arms', 'cable'),
  ('Skull Crusher', 'arms', 'barbell'),
  ('Hanging Leg Raise', 'core', 'bodyweight'),
  ('Plank', 'core', 'bodyweight')
on conflict do nothing;
