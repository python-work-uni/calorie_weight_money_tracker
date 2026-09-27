export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalType = 'cut' | 'maintain' | 'bulk'

/** Activity multipliers applied to BMR to estimate TDEE. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary — little or no exercise',
  light: 'Light — 1-3 days a week',
  moderate: 'Moderate — 3-5 days a week',
  active: 'Active — 6-7 days a week',
  very_active: 'Very active — hard exercise and a physical job',
}

export const GOAL_LABELS: Record<GoalType, string> = {
  cut: 'Cut — lose weight',
  maintain: 'Maintain',
  bulk: 'Bulk — gain weight',
}

/** Roughly the energy contained in 1 kg of body mass. */
export const KCAL_PER_KG = 7700

export type TdeeInput = {
  weightKg: number
  heightCm: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
  goalType: GoalType
  /** Magnitude in kg per week; the direction comes from goalType. */
  goalRate: number
}

export type TdeeResult = {
  /** Basal metabolic rate, Mifflin-St Jeor. */
  bmr: number
  /** Maintenance calories at the supplied activity level. */
  tdee: number
  /** Daily target after applying the goal, rounded to the nearest 10 kcal. */
  targetKcal: number
  /** Signed daily calorie offset: negative when cutting, positive when bulking. */
  dailyAdjustment: number
}

/** Completed whole years between a date of birth (YYYY-MM-DD) and a reference date. */
export function ageFromDob(dateOfBirth: string, today: Date = new Date()): number {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`)
  if (Number.isNaN(dob.getTime())) {
    throw new Error(`Invalid date of birth: ${dateOfBirth}`)
  }

  let age = today.getUTCFullYear() - dob.getUTCFullYear()
  const monthDelta = today.getUTCMonth() - dob.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1
  }
  return age
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step

/**
 * Mifflin-St Jeor BMR, scaled by activity, then shifted by the goal.
 *
 *   BMR    = 10*kg + 6.25*cm - 5*age + (male ? +5 : -161)
 *   TDEE   = BMR * activityMultiplier
 *   target = TDEE +/- (goalRate * 7700 / 7)
 *
 * Weight is expected to come from the latest weight log, so the target drifts
 * as weight changes rather than being a fixed number.
 */
export function calculateTdee(input: TdeeInput): TdeeResult {
  const { weightKg, heightCm, age, sex, activityLevel, goalType, goalRate } = input

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel]

  let dailyAdjustment = 0
  if (goalType !== 'maintain') {
    const magnitude = (Math.max(goalRate, 0) * KCAL_PER_KG) / 7
    dailyAdjustment = goalType === 'cut' ? -magnitude : magnitude
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: roundTo(tdee + dailyAdjustment, 10),
    dailyAdjustment: Math.round(dailyAdjustment),
  }
}
