export type WeightPoint = { date: string; weightKg: number }

const DAY_MS = 86_400_000

/** Parse YYYY-MM-DD as UTC midnight so the host time zone cannot shift the day. */
const toTime = (date: string): number => Date.parse(`${date}T00:00:00Z`)

export function sortByDate(points: WeightPoint[]): WeightPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Trailing average over a window measured in **days**, not samples.
 *
 * Weigh-ins are not reliably daily, so a sample-count window would silently
 * keep including older readings after a gap. Expects `sorted` ascending.
 */
export function rollingAverage(sorted: WeightPoint[], windowDays = 7): number[] {
  return sorted.map((point, index) => {
    const end = toTime(point.date)
    const start = end - (windowDays - 1) * DAY_MS

    let sum = 0
    let count = 0
    for (let i = index; i >= 0; i -= 1) {
      if (toTime(sorted[i].date) < start) break
      sum += sorted[i].weightKg
      count += 1
    }
    return sum / count
  })
}

export type WeightSeriesPoint = { date: string; weight: number; average: number }

/** Chart-ready series: raw weight plus the rolling average, aligned by index. */
export function buildSeries(points: WeightPoint[], windowDays = 7): WeightSeriesPoint[] {
  const sorted = sortByDate(points)
  const averages = rollingAverage(sorted, windowDays)
  return sorted.map((point, index) => ({
    date: point.date,
    weight: point.weightKg,
    average: averages[index],
  }))
}

/** Keep only points within the trailing window ending at the latest reading. */
export function filterByRange(points: WeightPoint[], days: number | null): WeightPoint[] {
  const sorted = sortByDate(points)
  if (days === null || sorted.length === 0) return sorted

  const end = toTime(sorted[sorted.length - 1].date)
  const start = end - (days - 1) * DAY_MS
  return sorted.filter((point) => toTime(point.date) >= start)
}

export type WeightChange = { from: string; to: string; changeKg: number }

/** Signed change between the first and last reading in the range. */
export function changeOverRange(points: WeightPoint[], days: number | null): WeightChange | null {
  const inRange = filterByRange(points, days)
  if (inRange.length < 2) return null

  const first = inRange[0]
  const last = inRange[inRange.length - 1]
  return { from: first.date, to: last.date, changeKg: last.weightKg - first.weightKg }
}
