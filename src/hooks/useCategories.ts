import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

export type CategoryKind = 'food' | 'spending'

export type Category = {
  id: string
  name: string
  color: string | null
  icon: string | null
  is_preset: boolean
}

const TABLE: Record<CategoryKind, string> = {
  food: 'food_categories',
  spending: 'spending_categories',
}

/** Preset rows are seeded per user by a trigger; the user can add their own. */
export function useCategories(kind: CategoryKind) {
  const { session } = useSession()
  const userId = session?.user.id ?? null
  const table = TABLE[kind]

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const { data, error: queryError } = await supabase
      .from(table)
      .select('id, name, color, icon, is_preset')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (queryError) setError(queryError.message)
    else setCategories((data ?? []) as Category[])

    setLoading(false)
  }, [userId, table])

  useEffect(() => {
    void reload()
  }, [reload])

  const create = useCallback(
    async (name: string, color: string | null) => {
      if (!userId) return { error: 'Not signed in' }

      const { error: insertError } = await supabase
        .from(table)
        .insert({ user_id: userId, name: name.trim(), color })

      if (insertError) return { error: insertError.message }

      await reload()
      return { error: null }
    },
    [userId, table, reload],
  )

  const rename = useCallback(
    async (id: string, name: string, color: string | null) => {
      const { error: updateError } = await supabase
        .from(table)
        .update({ name: name.trim(), color })
        .eq('id', id)

      if (updateError) return { error: updateError.message }

      await reload()
      return { error: null }
    },
    [table, reload],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
      if (deleteError) return { error: deleteError.message }

      setCategories((previous) => previous.filter((category) => category.id !== id))
      return { error: null }
    },
    [table],
  )

  return { categories, loading, error, create, rename, remove, reload }
}
