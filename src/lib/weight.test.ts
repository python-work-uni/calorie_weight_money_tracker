import { describe, expect, it } from 'vitest'
import { changeOverRange, filterByRange, rollingAverage, sortByDate } from './weight'
import type { WeightPoint } from './weight'

const p = (date: string, weightKg: number): WeightPoint => ({ date, weightKg })

describe('sortByDate', () => {
  it('orders ascending without mutating the input', () => {
    const input = [p('2026-03-02', 80), p('2026-03-01', 81)]

    expect(sortByDate(input).map((x) => x.date)).toEqual(['2026-03-01', '2026-03-02'])
    expect(input[0].date).toBe('2026-03-02')
  })
})

describe('rollingAverage', () => {
  it('averages the whole window once it is full', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7].map((day, i) =>
      p(`2026-03-0${day}`, 80 + i),
    )

    const averages = rollingAverage(sorted, 7)

    expect(averages[0]).toBeCloseTo(80) // only itself so far
    expect(averages[6]).toBeCloseTo(83) // (80+81+82+83+84+85+86)/7
  })

  it('measures the window in days, so a gap does not drag in stale readings', () => {
    const averages = rollingAverage([p('2026-03-01', 80), p('2026-03-20', 90)], 7)

    // 2026-03-01 is far outside the 7 days ending 2026-03-20.
    expect(averages[1]).toBeCloseTo(90)
  })

  it('includes a point sitting exactly on the window edge', () => {
    // A 7-day window ending 2026-03-07 starts on 2026-03-01.
    const averages = rollingAverage([p('2026-03-01', 70), p('2026-03-07', 84)], 7)

    expect(averages[1]).toBeCloseTo(77)
  })
})

describe('filterByRange', () => {
  it('keeps only points inside the trailing window', () => {
    const points = [p('2026-01-01', 90), p('2026-03-01', 80), p('2026-03-05', 79)]

    expect(filterByRange(points, 30).map((x) => x.date)).toEqual(['2026-03-01', '2026-03-05'])
  })

  it('returns everything when the range is null, sorted', () => {
    const points = [p('2026-03-05', 79), p('2026-01-01', 90)]

    expect(filterByRange(points, null).map((x) => x.date)).toEqual(['2026-01-01', '2026-03-05'])
  })

  it('handles an empty series', () => {
    expect(filterByRange([], 30)).toEqual([])
  })
})

describe('changeOverRange', () => {
  it('reports the signed change across the range', () => {
    const change = changeOverRange([p('2026-03-01', 82), p('2026-03-05', 80.4)], 30)

    expect(change?.from).toBe('2026-03-01')
    expect(change?.to).toBe('2026-03-05')
    expect(change?.changeKg).toBeCloseTo(-1.6)
  })

  it('is null when there is nothing to compare', () => {
    expect(changeOverRange([p('2026-03-01', 82)], 30)).toBeNull()
    expect(changeOverRange([], 30)).toBeNull()
  })

  it('ignores readings that fall outside the range', () => {
    const points = [p('2026-01-01', 95), p('2026-03-01', 82), p('2026-03-05', 80.4)]

    expect(changeOverRange(points, 30)?.changeKg).toBeCloseTo(-1.6)
  })
})
