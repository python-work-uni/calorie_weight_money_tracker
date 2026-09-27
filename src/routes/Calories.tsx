import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/ui/Page'
import { useCategories } from '../hooks/useCategories'
import { useFood } from '../hooks/useFood'
import type { FoodEntry } from '../hooks/useFood'
import { useProfile } from '../hooks/useProfile'
import { summariseDay } from '../lib/calories'
import { addDays, todayInTimeZone } from '../lib/dates'
import { formatDateLong, formatKcal, formatKg } from '../lib/format'

const FIELD = 'w-full rounded border border-slate-300 px-3 py-2 text-base'
const LABEL = 'mb-1 block text-sm font-medium'

export default function Calories() {
  const { target, timezone } = useProfile()
  const { categories } = useCategories('food')

  // null means "follow today", so the date stays correct if the profile's time
  // zone loads after first paint.
  const [dateOverride, setDateOverride] = useState<string | null>(null)
  const activeDate = dateOverride ?? todayInTimeZone(timezone)

  const { entries, loading, error: loadError, add, update, remove } = useFood({
    from: activeDate,
    to: activeDate,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')
  const [kcal, setKcal] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const summary = summariseDay(entries, target?.targetKcal ?? null)

  function resetForm() {
    setEditingId(null)
    setName('')
    setGrams('')
    setKcal('')
    setCategoryId('')
    setNote('')
    setError(null)
  }

  function startEdit(entry: FoodEntry) {
    setEditingId(entry.id)
    setName(entry.name)
    setGrams(entry.grams === null ? '' : String(entry.grams))
    setKcal(String(entry.kcal))
    setCategoryId(entry.category_id ?? '')
    setNote(entry.note ?? '')
    setError(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    const kcalValue = Number(kcal)
    if (name.trim() === '') {
      setError('Give the entry a name.')
      return
    }
    if (!Number.isFinite(kcalValue) || kcalValue < 0) {
      setError('Calories must be a number of 0 or more.')
      return
    }

    const gramsValue = grams.trim() === '' ? null : Number(grams)
    if (gramsValue !== null && (!Number.isFinite(gramsValue) || gramsValue < 0)) {
      setError('Grams must be a number of 0 or more, or blank.')
      return
    }

    const payload = {
      date: activeDate,
      name,
      grams: gramsValue,
      kcal: kcalValue,
      category_id: categoryId === '' ? null : categoryId,
      note: note.trim() === '' ? null : note.trim(),
    }

    setBusy(true)
    setError(null)
    const result = editingId ? await update(editingId, payload) : await add(payload)
    setBusy(false)

    if (result.error) setError(result.error)
    else resetForm()
  }

  return (
    <Page
      title="Calories"
      subtitle="Logged per item, weighed in grams."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateOverride(addDays(activeDate, -1))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            aria-label="Previous day"
          >
            ←
          </button>
          <input
            type="date"
            value={activeDate}
            onChange={(event) => setDateOverride(event.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setDateOverride(addDays(activeDate, 1))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            aria-label="Next day"
          >
            →
          </button>
          {dateOverride !== null ? (
            <button
              type="button"
              onClick={() => setDateOverride(null)}
              className="text-sm text-slate-600 underline"
            >
              Today
            </button>
          ) : null}
        </div>

        <Link to="/calories/ai" className="text-sm font-medium underline">
          Describe a meal to the AI agent →
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-500">{formatDateLong(activeDate)}</h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-2xl font-semibold tabular-nums">{formatKcal(summary.total)}</p>
          <p className="text-sm text-slate-600">
            {summary.remaining === null ? (
              'No target set'
            ) : summary.over ? (
              <span className="text-red-600">
                {formatKcal(Math.abs(summary.remaining))} over {formatKcal(target?.targetKcal ?? 0)}
              </span>
            ) : (
              <>
                {formatKcal(summary.remaining)} left of {formatKcal(target?.targetKcal ?? 0)}
              </>
            )}
          </p>
          <Link to="/calories/charts" className="text-sm underline">
            Charts
          </Link>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-500">
            {editingId ? 'Edit entry' : 'Add an entry'}
          </h3>

          <label className="block">
            <span className={LABEL}>Name</span>
            <input
              className={FIELD}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Grilled beef short rib"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>Grams</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                className={FIELD}
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                placeholder="optional"
              />
            </label>

            <label className="block">
              <span className={LABEL}>Calories (kcal)</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                className={FIELD}
                value={kcal}
                onChange={(event) => setKcal(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className={LABEL}>Category</span>
            <select
              className={FIELD}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Note (optional)</span>
            <input className={FIELD} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          {error ? (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-900 px-4 py-2.5 text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add entry'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-slate-300 px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white">
          <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
            {loading ? 'Loading…' : `${entries.length} item${entries.length === 1 ? '' : 's'}`}
          </h3>

          {loadError ? (
            <p className="px-5 py-3 text-sm text-red-700">{loadError}</p>
          ) : entries.length === 0 && !loading ? (
            <p className="px-5 py-3 text-sm text-slate-500">Nothing logged for this day yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {entry.name}
                      {entry.source === 'ai' ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800">
                          AI
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.grams !== null ? `${formatKg(Number(entry.grams), 0)} · ` : ''}
                      {categories.find((c) => c.id === entry.category_id)?.name ?? 'Uncategorised'}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums">{formatKcal(Number(entry.kcal))}</span>
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  )
}
