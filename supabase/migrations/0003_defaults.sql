-- Defaults: keep profiles.updated_at fresh, and seed preset categories the
-- first time a profile row is created (which happens on first sign-in).

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Preset categories
--
-- Runs AFTER INSERT on profiles. security definer so the seeding is not subject
-- to the category tables' RLS policies; the inserted user_id is always
-- new.user_id, so ownership is still correct.
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.food_categories (user_id, name, is_preset, icon, color) values
    (new.user_id, 'Meat',       true, '🍖', '#ef4444'),
    (new.user_id, 'Vegetables', true, '🥦', '#22c55e'),
    (new.user_id, 'Grains',     true, '🌾', '#f59e0b'),
    (new.user_id, 'Dairy',      true, '🧀', '#3b82f6'),
    (new.user_id, 'Drinks',     true, '🥤', '#06b6d4'),
    (new.user_id, 'Snacks',     true, '🍫', '#a855f7'),
    (new.user_id, 'Eating out', true, '🍽️', '#f97316')
  on conflict (user_id, name) do nothing;

  insert into public.spending_categories (user_id, name, is_preset, icon, color) values
    (new.user_id, 'Groceries',     true, '🛒', '#22c55e'),
    (new.user_id, 'Eating out',    true, '🍜', '#f97316'),
    (new.user_id, 'Transport',     true, '🚗', '#3b82f6'),
    (new.user_id, 'Bills',         true, '🧾', '#6366f1'),
    (new.user_id, 'Health',        true, '💊', '#ec4899'),
    (new.user_id, 'Entertainment', true, '🎬', '#a855f7'),
    (new.user_id, 'Other',         true, '📦', '#64748b')
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_seed_categories on public.profiles;
create trigger profiles_seed_categories
  after insert on public.profiles
  for each row execute function public.seed_default_categories();
