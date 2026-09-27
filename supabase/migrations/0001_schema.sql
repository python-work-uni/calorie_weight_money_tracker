-- Schema for the personal tracking dashboard.
--
-- Every table is user-scoped. Row level security is applied separately in
-- 0002_rls.sql, and defaults/triggers live in 0003_defaults.sql.
--
-- Applied to the linked project with: npx supabase db push

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created on first sign-in by the client.
-- Holds the inputs for the Mifflin-St Jeor TDEE calculation.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  height_cm      numeric(5, 1) check (height_cm is null or height_cm between 50 and 300),
  date_of_birth  date,
  sex            text check (sex in ('male', 'female')),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal_type      text not null default 'maintain' check (goal_type in ('cut', 'maintain', 'bulk')),
  -- kg per week. Interpreted as a magnitude; the sign comes from goal_type.
  goal_rate      numeric(3, 2) not null default 0.50 check (goal_rate >= 0 and goal_rate <= 1.50),
  timezone       text not null default 'Australia/Sydney',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories: preset rows are seeded per user by the trigger in 0003.
-- ---------------------------------------------------------------------------
create table if not exists public.food_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  is_preset  boolean not null default false,
  icon       text,
  color      text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.spending_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  is_preset  boolean not null default false,
  icon       text,
  color      text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- ai_jobs: audit trail for the agent. Drafts are NOT stored here; only the
-- result of a completed call, plus the retry diagnostics from the plan's §9.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('calorie_proposal', 'insight')),
  input_text text,
  status     text not null default 'pending'
             check (status in ('pending', 'approved', 'discarded', 'failed')),
  payload    jsonb,
  sources    jsonb,
  attempts   integer,
  last_error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weight_logs: one entry per date. The unique constraint is the upsert target,
-- which is what enforces the plan's "logging a date again edits it" rule.
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 500),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- food_entries: one row per item, weight in grams.
-- grams is nullable because some items are naturally unit-based.
-- ---------------------------------------------------------------------------
create table if not exists public.food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  name        text not null check (length(trim(name)) > 0),
  grams       numeric(7, 1) check (grams is null or grams >= 0),
  kcal        numeric(7, 1) not null check (kcal >= 0),
  category_id uuid references public.food_categories (id) on delete set null,
  source      text not null default 'manual' check (source in ('manual', 'ai')),
  ai_job_id   uuid references public.ai_jobs (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- spending_entries: AUD. numeric(10,2) rather than a float, so totals reconcile.
-- ---------------------------------------------------------------------------
create table if not exists public.spending_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  amount_aud  numeric(10, 2) not null,
  category_id uuid references public.spending_categories (id) on delete set null,
  description text not null check (length(trim(description)) > 0),
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: every read is "this user's rows for a date range".
-- ---------------------------------------------------------------------------
create index if not exists weight_logs_user_date_idx
  on public.weight_logs (user_id, date desc);

create index if not exists food_entries_user_date_idx
  on public.food_entries (user_id, date desc);

create index if not exists spending_entries_user_date_idx
  on public.spending_entries (user_id, date desc);

create index if not exists ai_jobs_user_created_idx
  on public.ai_jobs (user_id, created_at desc);
