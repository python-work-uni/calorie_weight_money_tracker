import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import WeightTrend from '../components/charts/WeightTrend'
import Page from '../components/ui/Page'
import { useSession } from '../hooks/useSession'
import { useWeight } from '../hooks/useWeight'
import { todayInTimeZone } from '../lib/dates'
import { formatDateLong, formatKg, formatKgDelta } from '../lib/format'
import { supabase } from '../lib/supabase'
import { changeOverRange, filterByRange } from '../lib/weight'

const RANGES = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'All', days: null },
] as const

const FIELD = 'w-full rounded border border-slate-300 px-3 py-2 text-base'
const LABEL = 'mb-1 block text-sm font-medium'

export default function Weight() {
  const { session } = useSession()
  const userId = session?.user.id ?? null
  const { logs, loading, error: loadError, save, remove } = useWeight()

  const [goalKg, setGoalKg] = useState<number | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [rangeIndex, setRangeIndex] = useState(0)
  const [date, setDate] = useState(() => todayInTimeZone('Australia/Sydney'))
  const [weightInput, setWeightInput] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // This screen needs the profile's time zone (to know what "today" is) and the
  // optional goal weight used for the goal line.
  useEffect(() => {
    if (!userId) return
    let active = true

    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('timezone, goal_weight_kg')
        .eq('user_id', userId)
        .maybeSingle()

      if (!active || !data) return

      const row = data as { timezone: string | null; goal_weight_kg: number | null }
      const zone = row.timezone ?? 'Australia/Sydney'
      setDate(todayInTimeZone(zone))

      if (row.goal_weight_kg != null) {
        setGoalKg(Number(row.goal_weight_kg))
        setGoalInput(String(row.goal_weight_kg))
      }
    })()

    return () => {
      active = false
    }
  }, [userId])

  const points = useMemo(
    () => logs.map((log) => ({ date: log.date, weightKg: Number(log.weight_kg) })),
    [logs],
  )

  const days = RANGES[rangeIndex].days
  const visible = useMemo(() => filterByRange(points, days), [points, days])
  const change = useMemo(() => changeOverRange(points, days), [points, days])

  const latest = points.length > 0 ? points[points.length - 1] : null
  const toGoal = latest && goalKg != null ? latest.weightKg - goalKg : null

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const weightKg = Number(weightInput)

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setError('Enter a weight in kilograms.')
      return
    }

    setSaving(true)
    setError(null)
    const result = await save(date, weightKg, note.trim() === '' ? null : note.trim())
    setSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setWeightInput('')
      setNote('')
    }
  }

  async function onSaveGoal() {
    if (!userId) return

    const parsed = goalInput.trim() === '' ? null : Number(goalInput)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      setError('Goal weight must be a positive number, or blank to clear it.')
      return
    }

    // Upsert touches only the supplied column, so the rest of the profile is
    // left alone.
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, goal_weight_kg: parsed }, { onConflict: 'user_id' })

    if (upsertError) setError(upsertError.message)
    else {
      setError(null)
      setGoalKg(parsed)
    }
  }

  return (
    <Page title="Weight" subtitle="Logged in kilograms, with a 7-day rolling average.">
      <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="text-sm font-semibold text-slate-500">Log a weigh-in</h3>

            <label className="block">
              <span className={LABEL}>Date</span>
              <input
                type="date"
                required
                className={FIELD}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                required
                className={FIELD}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Note (optional)</span>
              <input
                className={FIELD}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>

            {error ? (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-slate-900 px-4 py-2.5 text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save weigh-in'}
            </button>
            <p className="text-xs text-slate-500">
              Saving the same date again edits that entry rather than adding another.
            </p>
          </form>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-500">Goal weight (optional)</h3>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 75"
                className={FIELD}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void onSaveGoal()}
                className="shrink-0 rounded border border-slate-300 px-4 py-2 text-sm"
              >
                Save
              </button>
            </div>
            {toGoal !== null ? (
              <p className="text-sm text-slate-600">
                {toGoal > 0 ? (
                  <>
                    <span className="font-medium">{formatKg(toGoal)}</span> above your goal.
                  </>
                ) : (
                  <>
                    <span className="font-medium">{formatKg(Math.abs(toGoal))}</span> below your
                    goal.
                  </>
                )}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded border border-slate-200 bg-white p-1">
              {RANGES.map((range, index) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setRangeIndex(index)}
                  className={`rounded px-3 py-1.5 text-sm ${
                    index === rangeIndex ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {change ? (
              <p className="text-sm text-slate-600">
                {formatKgDelta(change.changeKg)} over this range
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <WeightTrend points={visible} goalKg={goalKg} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
              {loading ? 'Loading…' : `${logs.length} weigh-in${logs.length === 1 ? '' : 's'}`}
            </h3>

            {loadError ? (
              <p className="px-5 py-3 text-sm text-red-700">{loadError}</p>
            ) : logs.length === 0 && !loading ? (
              <p className="px-5 py-3 text-sm text-slate-500">No weigh-ins logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...logs].reverse().map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums">
                        {formatKg(Number(log.weight_kg))}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateLong(log.date)}
                        {log.note ? ` · ${log.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void remove(log.id).then((result) => {
                          if (result.error) setError(result.error)
                        })
                      }}
                      className="shrink-0 rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
