import { MEAL_TYPES } from '../meals/mealTypes.js'

export const MEAL_SERIES = [
  ...MEAL_TYPES.map((type, index) => ({ ...type, color: ['#ebbb4a', '#86c069', '#75a9dc', '#e47f76'][index] })),
  { key: 'unclassified', label: '区分なし', color: '#b9a58e' },
]

export function nutrientValue(meal, key) {
  const value = meal[key]
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
}

export function mealNutritionRows(dates, meals, key) {
  return dates.map((date) => {
    const recorded = meals.filter((meal) => meal.recorded_on === date)
    const known = recorded.filter((meal) => nutrientValue(meal, key) !== null)
    const row = { date, count: recorded.length, missing: recorded.length - known.length }
    for (const type of MEAL_SERIES) row[type.key] = known.length ? 0 : null
    for (const meal of known) {
      const type = MEAL_SERIES.find((type) => type.key === meal.meal_type)?.key || 'unclassified'
      row[type] += nutrientValue(meal, key)
    }
    return row
  })
}

export function mealNutrientSummary(meals, key) {
  const known = meals.filter((meal) => nutrientValue(meal, key) !== null)
  const total = known.reduce((sum, meal) => sum + nutrientValue(meal, key), 0)
  const knownDays = new Set(known.map((meal) => meal.recorded_on)).size
  return { total: known.length ? total : null, average: knownDays ? total / knownDays : null, days: new Set(meals.map((meal) => meal.recorded_on)).size }
}

export function mealTimeRows(dates, meals) {
  const formatter = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return meals.flatMap((meal) => {
    const day = dates.indexOf(meal.recorded_on)
    if (day < 0 || !meal.eaten_at) return []
    const date = new Date(meal.eaten_at)
    if (Number.isNaN(date.getTime())) return []
    const time = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
    return [{ day, date: meal.recorded_on, minutes: Number(time.hour) * 60 + Number(time.minute), mealType: meal.meal_type }]
  })
}

export function mealTimeLabel(minutes) {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
}
