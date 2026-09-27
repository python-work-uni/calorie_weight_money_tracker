import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

export type FoodSource = 'manual' | 'ai'

export type FoodEntry = {
  id: string
  date: string
  name: string
  grams: number | null
  kcal: number
  category_id: string | null
  source: FoodSource
  note: string | null
}

export type FoodEntryInput = {
  date: string
  name: string
  grams: number | null
  kcal: number
  category_id: string | null
  note?: string | null
}

export type DateRange = { from: string; to: string }

/**
 * Food entries within an inclusive date range.
 *
 * The range is a dependency by value (from/to strings), not by object identity,
 * so callers can pass a fresh object literal each render without refetching.
 */
export function useFood(range: DateRange) {
  const { session } = useSession()
  const userId = session?.user.id ?? null
  const { from, to } = range

  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('food_entries')
      .select('id, date, name, grams, kcal, category_id, source, note')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) setError(queryError.message)
    else setEntries((data ?? []) as FoodEntry[])

    setLoading(false)
  }, [userId, from, to])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = useCallback(
    async (input: FoodEntryInput) => {
      if (!userId) return { error: 'Not signed in' }

      const { error: insertError } = await supabase.from('food_entries').insert({
        user_id: userId,
        date: input.date,
        name: input.name.trim(),
        grams: input.grams,
        kcal: input.kcal,
        category_id: input.category_id,
        note: input.note ?? null,
        source: 'manual' satisfies FoodSource,
      })

      if (insertError) return { error: insertError.message }

      await reload()
      return { error: null }
    },
    [userId, reload],
  )

  const update = useCallback(
    async (id: string, patch: Partial<FoodEntryInput>) => {
      const { error: updateError } = await supabase
        .from('food_entries')
        .update({
          ...(patch.date !== undefined ? { date: patch.date } : {}),
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.grams !== undefined ? { grams: patch.grams } : {}),
          ...(patch.kcal !== undefined ? { kcal: patch.kcal } : {}),
          ...(patch.category_id !== undefined ? { category_id: patch.category_id } : {}),
          ...(patch.note !== undefined ? { note: patch.note } : {}),
        })
        .eq('id', id)

      if (updateError) return { error: updateError.message }

      await reload()
      return { error: null }
    },
    [reload],
  )

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('food_entries').delete().eq('id', id)
    if (deleteError) return { error: deleteError.message }

    setEntries((previous) => previous.filter((entry) => entry.id !== id))
    return { error: null }
  }, [])

  return { entries, loading, error, add, update, remove, reload }
}
