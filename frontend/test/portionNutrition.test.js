import { test } from 'node:test'
import assert from 'node:assert/strict'
import { portionNutritionTotals } from '../src/pages/meals/portionNutrition.js'
const portion = (weight) => ({ weight_g: weight, nutrients_per_100g: { calories: 200, protein_g: 10, fat_g: 8, carbs_g: 22 } })
test('推定量の修正は100gあたりの値から再計算する', () => {
  assert.deepEqual(portionNutritionTotals([portion('150'), portion('200')]), { calories: '700', protein_g: '35', fat_g: '28', carbs_g: '77' })
})
test('量や一部の栄養値が不明なら0とみなさない', () => {
  assert.equal(portionNutritionTotals([portion('')]).calories, '')
  assert.equal(portionNutritionTotals([portion('-1')]).calories, '')
  assert.equal(portionNutritionTotals([{ ...portion('100'), nutrients_per_100g: { calories: null, protein_g: 0 } }]).calories, '')
  assert.equal(portionNutritionTotals([{ ...portion('100'), nutrients_per_100g: { calories: null, protein_g: 0 } }]).protein_g, '0')
})
