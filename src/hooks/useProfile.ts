import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ageFromDob, calculateTdee } from '../lib/tdee'
import type { ActivityLevel, GoalType, Sex, TdeeResult } from '../lib/tdee'
import { useSession } from './useSession'

export type ProfileRow = {
  user_id: string
  height_cm: number | null
  date_of_birth: string | null
  sex: Sex | null
  activity_level: ActivityLevel | null
  goal_type: GoalType | null
  goal_rate: number | null
  timezone: string | null
  goal_weight_kg: number | null
}

/**
 * The profile plus the latest logged weight, and the calorie target derived
 * from both.
 *
 * The target is deliberately derived rather than stored, so it drifts with
 * weight instead of going stale the moment the scale moves.
 */
export function useProfile() {
  const { session } = useSession()
  const userId = session?.user.id ?? null

  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const [profileResult, weightResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('weight_logs')
        .select('weight_kg')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1),
    ])

    if (profileResult.error) setError(profileResult.error.message)
    else setProfile((profileResult.data as ProfileRow | null) ?? null)

    const weights = weightResult.data as { weight_kg: number }[] | null
    setLatestWeightKg(weights && weights.length > 0 ? Number(weights[0].weight_kg) : null)

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const target = useMemo<TdeeResult | null>(() => {
    if (!profile || latestWeightKg === null) return null

    const { height_cm, date_of_birth, sex, activity_level, goal_type, goal_rate } = profile
    if (height_cm === null || !date_of_birth || !sex || !activity_level || !goal_type) return null

    try {
      const age = ageFromDob(date_of_birth)
      if (age < 0 || age > 120) return null

      return calculateTdee({
        weightKg: latestWeightKg,
        heightCm: Number(height_cm),
        age,
        sex,
        activityLevel: activity_level,
        goalType: goal_type,
        goalRate: goal_rate === null ? 0 : Number(goal_rate),
      })
    } catch {
      return null
    }
  }, [profile, latestWeightKg])

  return {
    profile,
    latestWeightKg,
    target,
    timezone: profile?.timezone ?? 'Australia/Sydney',
    loading,
    error,
    reload,
  }
}
