import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

export type WeightLog = {
  id: string
  date: string
  weight_kg: number
  note: string | null
}

/**
 * Weight logs for the signed-in user, oldest first.
 *
 * `save` upserts on (user_id, date), so logging the same date twice edits the
 * existing row rather than creating a duplicate. The unique constraint in the
 * database is what actually enforces that.
 */
export function useWeight() {
  const { session } = useSession()
  const userId = session?.user.id ?? null

  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('weight_logs')
      .select('id, date, weight_kg, note')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (queryError) setError(queryError.message)
    else setLogs((data ?? []) as WeightLog[])

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (date: string, weightKg: number, note: string | null) => {
      if (!userId) return { error: 'Not signed in' }

      const { error: upsertError } = await supabase
        .from('weight_logs')
        .upsert(
          { user_id: userId, date, weight_kg: weightKg, note },
          { onConflict: 'user_id,date' },
        )

      if (upsertError) return { error: upsertError.message }

      await reload()
      return { error: null }
    },
    [userId, reload],
  )

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('weight_logs').delete().eq('id', id)
    if (deleteError) return { error: deleteError.message }

    setLogs((previous) => previous.filter((log) => log.id !== id))
    return { error: null }
  }, [])

  return { logs, loading, error, save, remove, reload }
}
