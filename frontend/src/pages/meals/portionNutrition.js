const KEYS = ['calories', 'protein_g', 'fat_g', 'carbs_g']
export function portionNutritionTotals(portions) {
  const totals = Object.fromEntries(KEYS.map((key) => {
    const known = portions.length > 0 && portions.every((portion) => {
      const value = portion.nutrients_per_100g?.[key]
      const weight = Number(portion.weight_g)
      return Number.isFinite(weight) && weight > 0 && weight <= 10000 && value != null && Number.isFinite(Number(value)) && Number(value) >= 0
    })
    return [key, known ? portions.reduce((sum, portion) => sum + Number(portion.nutrients_per_100g[key]) * Number(portion.weight_g) / 100, 0) : null]
  }))
  if (KEYS.every((key) => totals[key] != null)) {
    const energy = totals.protein_g * 4 + totals.fat_g * 9 + totals.carbs_g * 4
    if (Math.abs(energy - totals.calories) > Math.max(50, totals.calories * 0.25)) return Object.fromEntries(KEYS.map((key) => [key, null]))
  }
  return Object.fromEntries(KEYS.map((key) => [key, totals[key] == null ? '' : String(Math.round(totals[key] * (key === 'calories' ? 1 : 10)) / (key === 'calories' ? 1 : 10))]))
}
