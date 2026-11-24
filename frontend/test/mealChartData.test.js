import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mealNutritionRows, mealNutrientSummary, mealTimeRows, mealTimeLabel } from '../src/pages/details/mealChartData.js'

const dates = ['2026-11-16', '2026-11-17']
test('食事区分ごとに栄養値を合計し、未記録をゼロと区別する', () => {
  const rows = mealNutritionRows(dates, [
    { recorded_on: dates[0], meal_type: 'breakfast', calories: 300 },
    { recorded_on: dates[0], meal_type: 'breakfast', calories: '100' },
    { recorded_on: dates[0], meal_type: 'lunch', calories: 500 },
    { recorded_on: dates[0], meal_type: 'snack', calories: null },
  ], 'calories')
  assert.equal(rows[0].breakfast, 400)
  assert.equal(rows[0].lunch, 500)
  assert.equal(rows[0].missing, 1)
  assert.equal(rows[1].breakfast, null)
})
test('ゼロの記録と未入力を区別し、共有記録の区分なしにも対応する', () => {
  const rows = mealNutritionRows(dates, [
    { recorded_on: dates[0], protein_g: 0 },
    { recorded_on: dates[1], protein_g: null },
  ], 'protein_g')
  assert.equal(rows[0].unclassified, 0)
  assert.equal(rows[1].unclassified, null)
})
test('平均は選んだ栄養素を入力した日で計算する', () => {
  const meals = [
    { recorded_on: dates[0], protein_g: 10 },
    { recorded_on: dates[0], protein_g: 20 },
    { recorded_on: dates[1], protein_g: null },
  ]
  assert.deepEqual(mealNutrientSummary(meals, 'protein_g'), { total: 30, average: 30, days: 2 })
  assert.deepEqual(mealNutrientSummary(meals, 'calories'), { total: null, average: null, days: 2 })
})
test('食事時刻は端末のタイムゾーンに関わらず日本時間で集計する', () => {
  const rows = mealTimeRows(dates, [
    { recorded_on: dates[0], eaten_at: '2026-11-15T23:30:00Z', meal_type: 'breakfast' },
    { recorded_on: dates[1], eaten_at: '2026-11-17T23:45:00+09:00', meal_type: 'snack' },
    { recorded_on: dates[1] },
    { recorded_on: dates[1], eaten_at: 'invalid' },
    { recorded_on: '2026-11-15', eaten_at: '2026-11-15T12:00:00+09:00' },
  ])
  assert.equal(rows.length, 2)
  assert.equal(rows[0].day, 0)
  assert.equal(rows[0].minutes, 510)
  assert.equal(rows[1].minutes, 1425)
  assert.equal(mealTimeLabel(rows[0].minutes), '08:30')
  assert.equal(mealTimeLabel(1440), '24:00')
})
