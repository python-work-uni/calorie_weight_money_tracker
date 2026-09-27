-- Row level security.
--
-- This file is the backbone of the project's security requirement: nobody but
-- the signed-in owner may read or write any row, even with the public anon key.
--
-- Policies are generated in a loop so every table gets an identical, auditable
-- set. Two properties matter:
--
--   1. No policy is created for the `anon` role, so an unauthenticated request
--      has `auth.uid() = null` and matches nothing. Access is denied by default.
--   2. Inserts and updates carry a WITH CHECK as well as USING, so a user
--      cannot write a row owned by someone else.

do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'food_categories',
    'spending_categories',
    'ai_jobs',
    'weight_logs',
    'food_entries',
    'spending_entries'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    -- Reads: only your own rows.
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select', t
    );

    -- Inserts: only rows you own. Rejected otherwise.
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert', t
    );

    -- Updates: may only target rows you own, and may not reassign ownership.
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update', t
    );

    -- Deletes: only your own rows.
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      t || '_delete', t
    );
  end loop;
end $$;
