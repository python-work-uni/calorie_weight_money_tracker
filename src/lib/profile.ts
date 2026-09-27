import { supabase } from './supabase'

/**
 * Ensure a profile row exists for the signed-in user.
 *
 * Runs after every successful sign-in. `ignoreDuplicates` turns it into an
 * ON CONFLICT DO NOTHING, so it is a no-op once the row exists and never
 * overwrites saved preferences.
 *
 * The database seeds the preset categories via an AFTER INSERT trigger on
 * this row (see supabase/migrations/0003_defaults.sql).
 */
export async function ensureProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  if (error) throw error
}
