import { describe, expect, it } from 'vitest'
import { ageFromDob, calculateTdee } from './tdee'

describe('ageFromDob', () => {
  it('does not count a birthday that has not happened yet this year', () => {
    expect(ageFromDob('2000-05-15', new Date('2026-05-14T00:00:00Z'))).toBe(25)
  })

  it('counts the birthday on the day itself', () => {
    expect(ageFromDob('2000-05-15', new Date('2026-05-15T00:00:00Z'))).toBe(26)
  })

  it('handles a birthday later in the year', () => {
    expect(ageFromDob('2000-12-31', new Date('2026-01-01T00:00:00Z'))).toBe(25)
  })

  it('rejects nonsense input rather than silently returning NaN', () => {
    expect(() => ageFromDob('not-a-date')).toThrow()
  })
})

describe('calculateTdee', () => {
  it('male, maintain: BMR 1780 and TDEE 2759 at moderate activity', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
      goalType: 'maintain',
      goalRate: 0,
    })

    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(result.bmr).toBe(1780)
    expect(result.tdee).toBe(2759) // 1780 * 1.55
    expect(result.dailyAdjustment).toBe(0)
    expect(result.targetKcal).toBe(2760) // rounded to nearest 10
  })

  it('female, cut 0.5 kg/week: subtracts 550 kcal from TDEE', () => {
    const result = calculateTdee({
      weightKg: 60,
      heightCm: 165,
      age: 25,
      sex: 'female',
      activityLevel: 'sedentary',
      goalType: 'cut',
      goalRate: 0.5,
    })

    // 10*60 + 6.25*165 - 5*25 - 161 = 1345.25 -> 1345
    expect(result.bmr).toBe(1345)
    expect(result.tdee).toBe(1614) // 1345.25 * 1.2 = 1614.3
    expect(result.dailyAdjustment).toBe(-550) // 0.5 * 7700 / 7
    expect(result.targetKcal).toBe(1060) // 1614.3 - 550 = 1064.3 -> 1060
  })

  it('male, bulk 0.25 kg/week: adds 275 kcal to TDEE', () => {
    const result = calculateTdee({
      weightKg: 90,
      heightCm: 175,
      age: 40,
      sex: 'male',
      activityLevel: 'active',
      goalType: 'bulk',
      goalRate: 0.25,
    })

    expect(result.tdee).toBe(3103) // (10*90 + 6.25*175 - 200 + 5) * 1.725
    expect(result.dailyAdjustment).toBe(275) // 0.25 * 7700 / 7
    expect(result.targetKcal).toBe(3380)
  })

  it('maintain ignores goalRate entirely', () => {
    const base = {
      weightKg: 70,
      heightCm: 170,
      age: 35,
      sex: 'female' as const,
      activityLevel: 'light' as const,
      goalType: 'maintain' as const,
    }

    expect(calculateTdee({ ...base, goalRate: 0 }).targetKcal).toBe(
      calculateTdee({ ...base, goalRate: 1 }).targetKcal,
    )
  })

  it('a larger cut produces a lower target', () => {
    const base = {
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male' as const,
      activityLevel: 'moderate' as const,
      goalType: 'cut' as const,
    }

    expect(calculateTdee({ ...base, goalRate: 1 }).targetKcal).toBeLessThan(
      calculateTdee({ ...base, goalRate: 0.25 }).targetKcal,
    )
  })

  it('never returns a non-finite target', () => {
    const result = calculateTdee({
      weightKg: 70,
      heightCm: 170,
      age: 30,
      sex: 'female',
      activityLevel: 'moderate',
      goalType: 'maintain',
      goalRate: 0,
    })

    expect(Number.isFinite(result.targetKcal)).toBe(true)
  })
})
