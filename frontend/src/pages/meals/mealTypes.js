// 食事の区分（meals.meal_type）と栄養値の項目
export const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食', goalTime: 'breakfast_time' },
  { key: 'lunch', label: '昼食', goalTime: 'lunch_time' },
  { key: 'dinner', label: '夕食', goalTime: 'dinner_time' },
  { key: 'snack', label: '間食' },
]

export const mealTypeLabel = (key) => MEAL_TYPES.find((type) => type.key === key)?.label ?? key

export const NUTRIENTS = [
  { key: 'calories', goalKey: 'calorie_goal', label: 'カロリー', unit: 'kcal', step: 1 },
  { key: 'protein_g', goalKey: 'protein_goal_g', label: 'たんぱく質', unit: 'g', step: 0.1 },
  { key: 'fat_g', goalKey: 'fat_goal_g', label: '脂質', unit: 'g', step: 0.1 },
  { key: 'carbs_g', goalKey: 'carbs_goal_g', label: '炭水化物', unit: 'g', step: 0.1 },
  { key: 'fiber_g', goalKey: 'fiber_goal_g', label: '食物繊維', unit: 'g', step: 0.1 },
]

// 区分の初期値: 目標の食事時刻（朝・昼・夕）のうち今に一番近いもの。どれとも2時間以上離れていれば間食
export function guessMealType(goal, date = new Date()) {
  const minutesNow = date.getHours() * 60 + date.getMinutes()
  let best = null
  MEAL_TYPES.forEach((type) => {
    const time = type.goalTime && goal?.[type.goalTime]
    if (!time) return
    const [h, m] = time.split(':').map(Number)
    const diff = Math.abs(minutesNow - (h * 60 + m))
    if (!best || diff < best.diff) best = { key: type.key, diff }
  })
  return best && best.diff <= 120 ? best.key : 'snack'
}

// 食事の配列の栄養値の合計（未入力は 0）
export function sumNutrients(meals) {
  return Object.fromEntries(
    NUTRIENTS.map(({ key }) => [key, meals.reduce((sum, meal) => sum + Number(meal[key] || 0), 0)]),
  )
}
