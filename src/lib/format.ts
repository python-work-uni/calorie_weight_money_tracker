/** Display formatters. Metric throughout, currency in AUD. */

export const formatKg = (kg: number | null | undefined, digits = 1): string =>
  kg == null || !Number.isFinite(kg) ? '—' : `${kg.toFixed(digits)} kg`

/** Signed, for deltas: "+1.2 kg" / "−0.8 kg" (true minus sign, not a hyphen). */
export const formatKgDelta = (kg: number, digits = 1): string => {
  const sign = kg > 0 ? '+' : kg < 0 ? '\u2212' : ''
  return `${sign}${Math.abs(kg).toFixed(digits)} kg`
}

export const formatKcal = (kcal: number | null | undefined): string =>
  kcal == null || !Number.isFinite(kcal) ? '—' : `${Math.round(kcal).toLocaleString('en-AU')} kcal`

export const formatAud = (amount: number | null | undefined): string =>
  amount == null || !Number.isFinite(amount)
    ? '—'
    : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)

/** Format a YYYY-MM-DD date. UTC is forced so the day cannot shift. */
export const formatDateShort = (iso: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))

export const formatDateLong = (iso: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
