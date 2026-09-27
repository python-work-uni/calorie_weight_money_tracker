import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/ui/Page'
import ProgressRing from '../components/ui/ProgressRing'
import { useFood } from '../hooks/useFood'
import { useProfile } from '../hooks/useProfile'
import { sumKcal } from '../lib/calories'
import { todayInTimeZone } from '../lib/dates'
import { formatDateLong, formatKcal } from '../lib/format'

const FIELD = 'w-full rounded border border-slate-300 px-3 py-2 text-base'

export default function Today() {
  const { target, timezone } = useProfile()
  const today = todayInTimeZone(timezone)
  const { entries, loading, add, remove } = useFood({ from: today, to: today })

  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const consumed = sumKcal(entries)

  async function onQuickAdd(event: FormEvent) {
    event.preventDefault()

    const value = Number(kcal)
    if (name.trim() === '' || !Number.isFinite(value) || value < 0) {
      setError('Enter a name and a calorie figure.')
      return
    }

    setBusy(true)
    setError(null)
    const result = await add({
      date: today,
      name,
      grams: null,
      kcal: value,
      category_id: null,
    })
    setBusy(false)

    if (result.error) setError(result.error)
    else {
      setName('')
      setKcal('')
    }
  }

  return (
    <Page title="Today" subtitle={formatDateLong(today)}>
      <div className="grid gap-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <ProgressRing consumed={consumed} target={target?.targetKcal ?? null} />
        </section>

        <div className="space-y-6">
          <form
            onSubmit={onQuickAdd}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="text-sm font-semibold text-slate-500">Quick add</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className={FIELD}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What did you eat?"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className={`${FIELD} sm:w-40`}
                value={kcal}
                onChange={(event) => setKcal(event.target.value)}
                placeholder="kcal"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded bg-slate-900 px-4 py-2.5 text-white disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {error ? (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              For grams, categories and notes use the <Link to="/calories" className="underline">Calories</Link> screen.
            </p>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white">
            <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
              {loading ? 'Loading…' : `Today · ${formatKcal(consumed)}`}
            </h3>

            {entries.length === 0 && !loading ? (
              <p className="px-5 py-3 text-sm text-slate-500">Nothing logged yet today.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="truncate">{entry.name}</span>
                      {entry.source === 'ai' ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          AI
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums">{formatKcal(Number(entry.kcal))}</span>
                      <button
                        type="button"
                        onClick={() => {
                          void remove(entry.id).then((result) => {
                            if (result.error) setError(result.error)
                          })
                        }}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/weight" className="rounded border border-slate-200 bg-white px-4 py-2">
              Log weight
            </Link>
            <Link to="/spending" className="rounded border border-slate-200 bg-white px-4 py-2">
              Log spending
            </Link>
            <Link to="/calories/charts" className="rounded border border-slate-200 bg-white px-4 py-2">
              Calorie charts
            </Link>
          </div>
        </div>
      </div>
    </Page>
  )
}
