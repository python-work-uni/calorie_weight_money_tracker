import { useState } from 'react'
import CalorieBars from '../components/charts/CalorieBars'
import CategoryDonut from '../components/charts/CategoryDonut'
import Page from '../components/ui/Page'
import { useCategories } from '../hooks/useCategories'
import { useFood } from '../hooks/useFood'
import { useProfile } from '../hooks/useProfile'
import { buildDailySeries, sumKcal, totalsByCategory } from '../lib/calories'
import { addDays, todayInTimeZone } from '../lib/dates'
import { formatKcal } from '../lib/format'

const RANGES = [7, 30, 90] as const

export default function CalorieCharts() {
  const { target, timezone } = useProfile()
  const { categories } = useCategories('food')
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)

  const endDate = todayInTimeZone(timezone)
  const startDate = addDays(endDate, -(days - 1))
  const { entries, loading } = useFood({ from: startDate, to: endDate })

  const targetKcal = target?.targetKcal ?? null
  const series = buildDailySeries(entries, days, endDate)
  const byCategory = totalsByCategory(entries, categories)

  const rangeTotal = sumKcal(entries)
  const average = series.length > 0 ? rangeTotal / series.length : 0
  const daysWithEntries = series.filter((point) => point.kcal > 0).length
  const daysOver =
    targetKcal === null
      ? null
      : series.filter((point) => point.kcal > 0 && point.kcal > targetKcal).length

  return (
    <Page title="Calorie charts" subtitle="Intake against your target, and where it comes from.">
      <div className="mb-4 flex gap-1 rounded border border-slate-200 bg-white p-1">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setDays(range)}
            className={`rounded px-3 py-1.5 text-sm ${
              range === days ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            {range} days
          </button>
        ))}
      </div>

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-semibold tabular-nums">{formatKcal(rangeTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Daily average</p>
          <p className="text-lg font-semibold tabular-nums">{formatKcal(average)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Days logged</p>
          <p className="text-lg font-semibold tabular-nums">
            {daysWithEntries}/{days}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Days over target</p>
          <p className="text-lg font-semibold tabular-nums">
            {daysOver === null ? '—' : daysOver}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-500">
          Daily intake{targetKcal !== null ? ' vs target' : ''}
        </h3>
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
        ) : (
          <CalorieBars data={series} targetKcal={targetKcal} />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-500">
          Calories by category
        </h3>
        {byCategory.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No entries in this range yet.
          </p>
        ) : (
          <CategoryDonut totals={byCategory} />
        )}
      </section>
    </Page>
  )
}
