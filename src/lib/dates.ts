/**
 * Resolve calendar dates in a specific time zone rather than the host's.
 *
 * A naive `new Date().toISOString().slice(0, 10)` uses the host zone, so an
 * 11pm entry in Sydney can land on the wrong day. Everything that decides
 * "which day is this?" goes through here.
 */
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
