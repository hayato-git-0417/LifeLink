import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guessMealType } from '../src/pages/meals/mealTypes.js'
const at = (hour, minute = 0) => new Date(2026, 10, 17, hour, minute)
test('食事時刻の前後1時間を含めて判定する', () => {
  assert.equal(guessMealType(null, at(5, 59)), 'snack')
  assert.equal(guessMealType(null, at(6)), 'breakfast')
  assert.equal(guessMealType(null, at(8)), 'breakfast')
  assert.equal(guessMealType(null, at(8, 1)), 'snack')
  assert.equal(guessMealType(null, at(12)), 'lunch')
  assert.equal(guessMealType(null, at(15)), 'snack')
  assert.equal(guessMealType(null, at(19)), 'dinner')
})
test('個人の設定時刻・日付をまたぐ時間帯にも対応する', () => {
  const goal = { breakfast_time: '00:30', lunch_time: '12:00', dinner_time: '19:00' }
  assert.equal(guessMealType(goal, at(23, 30)), 'breakfast')
  assert.equal(guessMealType(goal, at(0, 30)), 'breakfast')
  assert.equal(guessMealType(goal, at(7)), 'snack')
})
