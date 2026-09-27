/**
 * Calendar-date helpers.
 *
 * Everything here works in UTC on `YYYY-MM-DD` strings. A date in this app is a
 * calendar day, not an instant, so converting through the host's local time zone
 * is exactly the bug we are avoiding. "Which day is it *here*?" is decided by
 * `todayInTimeZone`.
 */

const DAY_MS = 86_400_000

/** Resolve today's date in a specific time zone rather than the host's. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const toTime = (date: string): number => Date.parse(`${date}T00:00:00Z`)

export const dateFromTime = (time: number): string => new Date(time).toISOString().slice(0, 10)

/** Shift a calendar date by whole days. Negative values go backwards. */
export function addDays(date: string, delta: number): string {
  return dateFromTime(toTime(date) + delta * DAY_MS)
}

/** Inclusive list of every date from `from` to `to`. Empty if `from` > `to`. */
export function eachDayInclusive(from: string, to: string): string[] {
  const start = toTime(from)
  const end = toTime(to)

  const days: string[] = []
  for (let time = start; time <= end; time += DAY_MS) {
    days.push(dateFromTime(time))
  }
  return days
}

/** Whole days between two dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toTime(b) - toTime(a)) / DAY_MS)
}
