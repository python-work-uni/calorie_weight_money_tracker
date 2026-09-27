import { describe, expect, it } from 'vitest'
import { todayInTimeZone } from './dates'

describe('todayInTimeZone', () => {
  it('resolves the date in the requested zone, not the host zone', () => {
    const instant = new Date('2026-01-01T13:30:00Z')

    // 13:30 UTC is 00:30 the next day in Sydney during daylight saving.
    expect(todayInTimeZone('Australia/Sydney', instant)).toBe('2026-01-02')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-01-01')
  })

  it('gets the late-evening boundary right in standard time', () => {
    // 12:00 UTC is 22:00 the same day in Sydney outside daylight saving.
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T12:00:00Z'))).toBe('2026-07-05')
  })

  it('still says the previous day before the Sydney day rolls over', () => {
    // 10:00 UTC is 21:00 in Sydney, but 11:00 UTC would be 22:00 — same day.
    // 13:00 UTC is midnight, so 12:59 UTC must still be the earlier day.
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T13:59:00Z'))).toBe('2026-07-05')
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T14:30:00Z'))).toBe('2026-07-06')
  })
})
