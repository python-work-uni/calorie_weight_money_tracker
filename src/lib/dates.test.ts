import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, eachDayInclusive, todayInTimeZone } from './dates'

describe('todayInTimeZone', () => {
  it('resolves the date in the requested zone, not the host zone', () => {
    const instant = new Date('2026-01-01T13:30:00Z')

    // 13:30 UTC is 00:30 the next day in Sydney during daylight saving.
    expect(todayInTimeZone('Australia/Sydney', instant)).toBe('2026-01-02')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-01-01')
  })

  it('gets the late-evening boundary right in standard time', () => {
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T12:00:00Z'))).toBe('2026-07-05')
  })

  it('still says the previous day before the Sydney day rolls over', () => {
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T13:59:00Z'))).toBe('2026-07-05')
    expect(todayInTimeZone('Australia/Sydney', new Date('2026-07-05T14:30:00Z'))).toBe('2026-07-06')
  })
})

describe('addDays', () => {
  it('shifts forwards and backwards across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('is stable across daylight-saving transitions', () => {
    // Sydney shifts to daylight saving on 2026-10-04; a naive local-time
    // implementation can land on the wrong day here.
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04')
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05')
  })
})

describe('eachDayInclusive', () => {
  it('includes both endpoints', () => {
    expect(eachDayInclusive('2026-03-01', '2026-03-04')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
    ])
  })

  it('returns a single day when the range is one day', () => {
    expect(eachDayInclusive('2026-03-01', '2026-03-01')).toEqual(['2026-03-01'])
  })

  it('returns nothing when the range is inverted', () => {
    expect(eachDayInclusive('2026-03-04', '2026-03-01')).toEqual([])
  })
})

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-03-01', '2026-03-08')).toBe(7)
    expect(daysBetween('2026-03-08', '2026-03-01')).toBe(-7)
  })
})
