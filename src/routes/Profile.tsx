import { useEffect, useMemo, useState } from 'react'
import Page from '../components/ui/Page'
import { useSession } from '../hooks/useSession'
import { todayInTimeZone } from '../lib/dates'
import { supabase } from '../lib/supabase'
import { ACTIVITY_LABELS, GOAL_LABELS, ageFromDob, calculateTdee } from '../lib/tdee'
import type { ActivityLevel, GoalType, Sex } from '../lib/tdee'

type FormState = {
  heightCm: string
  dateOfBirth: string
  sex: Sex
  activityLevel: ActivityLevel
  goalType: GoalType
  goalRate: string
  timezone: string
  weightToday: string
}

const EMPTY_FORM: FormState = {
  heightCm: '',
  dateOfBirth: '',
  sex: 'male',
  activityLevel: 'moderate',
  goalType: 'maintain',
  goalRate: '0.5',
  timezone: 'Australia/Sydney',
  weightToday: '',
}

const FIELD = 'w-full rounded border border-slate-300 px-3 py-2 text-base'
const LABEL = 'mb-1 block text-sm font-medium'

export default function Profile() {
  const { session } = useSession()
  const userId = session?.user.id ?? null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!userId) return
    let active = true

    void (async () => {
      const [profileResult, weightResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('weight_logs')
          .select('weight_kg')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1),
      ])

      if (!active) return

      if (profileResult.error) setError(profileResult.error.message)

      const profile = profileResult.data as Record<string, unknown> | null
      if (profile) {
        setForm({
          heightCm: profile.height_cm == null ? '' : String(profile.height_cm),
          dateOfBirth: (profile.date_of_birth as string | null) ?? '',
          sex: (profile.sex as Sex | null) ?? 'male',
          activityLevel: (profile.activity_level as ActivityLevel | null) ?? 'moderate',
          goalType: (profile.goal_type as GoalType | null) ?? 'maintain',
          goalRate: profile.goal_rate == null ? '0.5' : String(profile.goal_rate),
          timezone: (profile.timezone as string | null) ?? 'Australia/Sydney',
          weightToday: '',
        })
      }

      const weights = weightResult.data as { weight_kg: number }[] | null
      if (weights && weights.length > 0) setLatestWeightKg(Number(weights[0].weight_kg))

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [userId])

  // Recomputed on every keystroke, which is what makes the target "live".
  const projection = useMemo(() => {
    const heightCm = Number(form.heightCm)
    const goalRate = Number(form.goalRate)

    if (!form.heightCm || !form.dateOfBirth || latestWeightKg === null) return null
    if (!Number.isFinite(heightCm) || heightCm <= 0) return null

    try {
      const age = ageFromDob(form.dateOfBirth)
      if (age < 0 || age > 120) return null
      return calculateTdee({
        weightKg: latestWeightKg,
        heightCm,
        age,
        sex: form.sex,
        activityLevel: form.activityLevel,
        goalType: form.goalType,
        goalRate: Number.isFinite(goalRate) ? goalRate : 0,
      })
    } catch {
      return null
    }
  }, [form, latestWeightKg])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function onSave() {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        height_cm: form.heightCm === '' ? null : Number(form.heightCm),
        date_of_birth: form.dateOfBirth === '' ? null : form.dateOfBirth,
        sex: form.sex,
        activity_level: form.activityLevel,
        goal_type: form.goalType,
        goal_rate: form.goalRate === '' ? 0 : Number(form.goalRate),
        timezone: form.timezone,
      },
      { onConflict: 'user_id' },
    )

    if (profileError) {
      setSaving(false)
      setError(profileError.message)
      return
    }

    // Weight lives in weight_logs (one row per date), so the same field works
    // whether it is filled in here or on the Weight screen later.
    if (form.weightToday !== '') {
      const date = todayInTimeZone(form.timezone)
      const { error: weightError } = await supabase
        .from('weight_logs')
        .upsert(
          { user_id: userId, date, weight_kg: Number(form.weightToday) },
          { onConflict: 'user_id,date' },
        )

      if (weightError) {
        setSaving(false)
        setError(weightError.message)
        return
      }
      setLatestWeightKg(Number(form.weightToday))
    }

    setSaving(false)
    setSaved(true)
  }

  if (loading) {
    return <Page title="Profile" subtitle="Loading…" />
  }

  return (
    <Page title="Profile" subtitle="Used to calculate your daily calorie target.">
      <div className="grid gap-8 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onSave()
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className={LABEL}>Height (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className={FIELD}
              value={form.heightCm}
              onChange={(e) => update('heightCm', e.target.value)}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Date of birth</span>
            <input
              type="date"
              className={FIELD}
              value={form.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Sex (used by the BMR formula)</span>
            <select
              className={FIELD}
              value={form.sex}
              onChange={(e) => update('sex', e.target.value as Sex)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Activity level</span>
            <select
              className={FIELD}
              value={form.activityLevel}
              onChange={(e) => update('activityLevel', e.target.value as ActivityLevel)}
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Goal</span>
            <select
              className={FIELD}
              value={form.goalType}
              onChange={(e) => update('goalType', e.target.value as GoalType)}
            >
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Rate (kg per week)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.05"
              min="0"
              max="1.5"
              disabled={form.goalType === 'maintain'}
              className={`${FIELD} disabled:bg-slate-100 disabled:text-slate-400`}
              value={form.goalRate}
              onChange={(e) => update('goalRate', e.target.value)}
            />
            {form.goalType === 'maintain' && (
              <span className="mt-1 block text-xs text-slate-500">
                Not used while maintaining.
              </span>
            )}
          </label>

          <label className="block">
            <span className={LABEL}>Weight today (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className={FIELD}
              value={form.weightToday}
              onChange={(e) => update('weightToday', e.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-500">
              {latestWeightKg === null
                ? 'No weight logged yet — the target needs one.'
                : `Latest logged weight: ${latestWeightKg} kg`}
            </span>
          </label>

          <label className="block">
            <span className={LABEL}>Time zone</span>
            <input
              className={FIELD}
              value={form.timezone}
              onChange={(e) => update('timezone', e.target.value)}
            />
          </label>

          {error ? (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-900 px-4 py-2.5 text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved ? <span className="text-sm text-green-700">Saved</span> : null}
          </div>
        </form>

        <section className="h-fit rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-500">Derived from your profile</h3>

          {projection ? (
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-slate-600">BMR</dt>
                <dd className="text-lg tabular-nums">{projection.bmr} kcal</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-slate-600">Maintenance (TDEE)</dt>
                <dd className="text-lg tabular-nums">{projection.tdee} kcal</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
                <dt className="text-sm font-medium">Daily target</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {projection.targetKcal} kcal
                </dd>
              </div>
              {projection.dailyAdjustment !== 0 ? (
                <p className="text-xs text-slate-500">
                  {projection.dailyAdjustment > 0 ? 'Surplus' : 'Deficit'} of{' '}
                  {Math.abs(projection.dailyAdjustment)} kcal/day versus maintenance.
                </p>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Enter your height, date of birth and a weight to see your target.
            </p>
          )}
        </section>
      </div>
    </Page>
  )
}
