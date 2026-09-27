import { describe, expect, it } from 'vitest'
import { buildDailySeries, sumKcal, summariseDay, totalsByCategory } from './calories'
import type { CategoryRef } from './calories'

const categories: CategoryRef[] = [
  { id: 'meat', name: 'Meat', color: '#ef4444' },
  { id: 'veg', name: 'Vegetables', color: '#22c55e' },
]

describe('sumKcal', () => {
  it('adds figures up', () => {
    expect(sumKcal([{ kcal: 100 }, { kcal: 250.5 }])).toBeCloseTo(350.5)
  })

  it('is zero for an empty day', () => {
    expect(sumKcal([])).toBe(0)
  })
})

describe('buildDailySeries', () => {
  it('returns one point per day, including days with no entries', () => {
    const entries = [
      { date: '2026-03-02', kcal: 500 },
      { date: '2026-03-04', kcal: 300 },
    ]

    const series = buildDailySeries(entries, 4, '2026-03-04')

    expect(series.map((point) => point.date)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
    ])
    expect(series.map((point) => point.kcal)).toEqual([0, 500, 0, 300])
  })

  it('sums several entries on the same day', () => {
    const entries = [
      { date: '2026-03-04', kcal: 500 },
      { date: '2026-03-04', kcal: 250 },
    ]

    expect(buildDailySeries(entries, 1, '2026-03-04')[0].kcal).toBe(750)
  })

  it('ignores entries outside the window', () => {
    const entries = [
      { date: '2026-02-01', kcal: 9999 },
      { date: '2026-03-04', kcal: 500 },
      { date: '2026-04-01', kcal: 9999 },
    ]

    const series = buildDailySeries(entries, 2, '2026-03-04')

    expect(series.reduce((total, point) => total + point.kcal, 0)).toBe(500)
  })
})

describe('totalsByCategory', () => {
  it('groups, names and orders by size', () => {
    const totals = totalsByCategory(
      [
        { kcal: 400, category_id: 'meat' },
        { kcal: 100, category_id: 'veg' },
        { kcal: 250, category_id: 'meat' },
      ],
      categories,
    )

    expect(totals).toEqual([
      { id: 'meat', name: 'Meat', color: '#ef4444', kcal: 650 },
      { id: 'veg', name: 'Vegetables', color: '#22c55e', kcal: 100 },
    ])
  })

  it('buckets null categories as Uncategorised instead of dropping them', () => {
    const totals = totalsByCategory(
      [
        { kcal: 300, category_id: null },
        { kcal: 200, category_id: 'meat' },
      ],
      categories,
    )

    expect(totals).toHaveLength(2)
    expect(totals.find((t) => t.name === 'Uncategorised')).toEqual({
      id: null,
      name: 'Uncategorised',
      color: '#94a3b8',
      kcal: 300,
    })
  })

  it('buckets a deleted category as Uncategorised, so slices still sum to the total', () => {
    const totals = totalsByCategory([{ kcal: 300, category_id: 'deleted-id' }], categories)

    expect(totals).toEqual([
      { id: 'deleted-id', name: 'Uncategorised', color: '#94a3b8', kcal: 300 },
    ])
  })
})

describe('summariseDay', () => {
  it('reports what is left against the target', () => {
    expect(summariseDay([{ kcal: 800 }, { kcal: 400 }], 2000)).toEqual({
      total: 1200,
      remaining: 800,
      over: false,
    })
  })

  it('flags going over, with a negative remainder', () => {
    expect(summariseDay([{ kcal: 2400 }], 2000)).toEqual({
      total: 2400,
      remaining: -400,
      over: true,
    })
  })

  it('has no remainder when there is no target', () => {
    expect(summariseDay([{ kcal: 2400 }], null)).toEqual({
      total: 2400,
      remaining: null,
      over: false,
    })
  })
})
