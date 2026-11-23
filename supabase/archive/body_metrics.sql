-- ============================================================================
-- BODY METRICS & PHYSICAL DETAILS SCHEMA
-- ============================================================================

-- 1. ADD HEIGHT COLUMN TO PROFILES TABLE
alter table public.profiles add column if not exists height numeric(5, 2);

-- 2. CREATE BODY METRICS TABLE
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  weight numeric(5, 2) not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. INDEXES FOR FAST QUERYING
create index if not exists idx_body_metrics_user_date on public.body_metrics(user_id, logged_at desc);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.body_metrics enable row level security;

drop policy if exists "Users can view own body metrics" on public.body_metrics;
drop policy if exists "Users can insert own body metrics" on public.body_metrics;
drop policy if exists "Users can update own body metrics" on public.body_metrics;
drop policy if exists "Users can delete own body metrics" on public.body_metrics;

create policy "Users can view own body metrics"
  on public.body_metrics for select
  using (user_id = auth.uid());

create policy "Users can insert own body metrics"
  on public.body_metrics for insert
  with check (user_id = auth.uid());

create policy "Users can update own body metrics"
  on public.body_metrics for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own body metrics"
  on public.body_metrics for delete
  using (user_id = auth.uid());
