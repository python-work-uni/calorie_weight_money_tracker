import { addDays, eachDayInclusive } from './dates'

/** Anything with a calorie figure and the day it belongs to. */
export type KcalEntry = { date: string; kcal: number }

export type CategoryRef = { id: string; name: string; color: string | null }

export type CategoryTotal = {
  id: string | null
  name: string
  color: string
  kcal: number
}

const UNCATEGORISED_ID = '__uncategorised__'
const FALLBACK_COLOR = '#94a3b8'

export function sumKcal(entries: { kcal: number }[]): number {
  return entries.reduce((total, entry) => total + Number(entry.kcal), 0)
}

/**
 * One point per calendar day across the trailing window, including days with no
 * entries.
 *
 * The zero-filled days matter: without them a bar chart silently omits the days
 * you ate nothing (or didn't log), which makes the gaps invisible and the x-axis
 * lie about spacing.
 */
export function buildDailySeries(
  entries: KcalEntry[],
  days: number,
  endDate: string,
): { date: string; kcal: number }[] {
  const start = addDays(endDate, -(days - 1))

  const totals = new Map<string, number>()
  for (const entry of entries) {
    if (entry.date < start || entry.date > endDate) continue
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + Number(entry.kcal))
  }

  return eachDayInclusive(start, endDate).map((date) => ({
    date,
    kcal: totals.get(date) ?? 0,
  }))
}

/**
 * Calorie totals grouped by category, largest first.
 *
 * Entries whose category is missing or has since been deleted are grouped under
 * one "Uncategorised" slice rather than being dropped, so the slices always sum
 * to the range total.
 */
export function totalsByCategory(
  entries: { kcal: number; category_id: string | null }[],
  categories: CategoryRef[],
): CategoryTotal[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const totals = new Map<string, CategoryTotal>()

  for (const entry of entries) {
    const key = entry.category_id ?? UNCATEGORISED_ID
    const category = entry.category_id ? byId.get(entry.category_id) : undefined

    const existing = totals.get(key)
    if (existing) {
      existing.kcal += Number(entry.kcal)
      continue
    }

    totals.set(key, {
      id: entry.category_id,
      name: category?.name ?? 'Uncategorised',
      color: category?.color ?? FALLBACK_COLOR,
      kcal: Number(entry.kcal),
    })
  }

  return [...totals.values()].sort((a, b) => b.kcal - a.kcal)
}

export type DaySummary = {
  total: number
  remaining: number | null
  over: boolean
}

/** Compare a day's intake against a target. `target` null means "no target set". */
export function summariseDay(entries: { kcal: number }[], target: number | null): DaySummary {
  const total = sumKcal(entries)

  if (target === null || target <= 0) {
    return { total, remaining: null, over: false }
  }

  return {
    total,
    remaining: target - total,
    over: total > target,
  }
}
