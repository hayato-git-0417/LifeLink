import { test } from 'node:test'
import assert from 'node:assert/strict'
import { birthdateParts, updateBirthdate, birthdateLimits } from '../src/components/birthdate.js'

const today = '2026-11-17'
test('年・月・日の途中選択を保持し、全て選んだ時にAPI用の日付にする', () => {
  let draft = birthdateParts('')
  draft = updateBirthdate(draft, 'year', '2000', today)
  assert.equal(draft.value, '')
  draft = updateBirthdate(draft, 'month', '4', today)
  assert.equal(draft.value, '')
  draft = updateBirthdate(draft, 'day', '1', today)
  assert.equal(draft.value, '2000-04-01')
  assert.deepEqual(birthdateParts(draft.value), { year: '2000', month: '4', day: '1' })
})
test('月末とうるう年の変更で存在しなくなる日を選び直せる', () => {
  assert.equal(birthdateLimits(birthdateParts('2000-02-29'), today).day, 29)
  const nonLeap = updateBirthdate(birthdateParts('2000-02-29'), 'year', '2001', today)
  assert.equal(nonLeap.day, '')
  assert.equal(nonLeap.value, '')
  const april = updateBirthdate(birthdateParts('2000-03-31'), 'month', '4', today)
  assert.equal(april.day, '')
  assert.equal(birthdateLimits(april, today).day, 30)
})
test('今年は今日までの月日を選択できる', () => {
  assert.deepEqual(birthdateLimits(birthdateParts(today), today), { month: 11, day: 17 })
  assert.equal(updateBirthdate(birthdateParts('2000-12-20'), 'year', '2026', today).month, '')
  assert.equal(updateBirthdate(birthdateParts('2000-11-20'), 'year', '2026', today).day, '')
  assert.equal(updateBirthdate(birthdateParts('2026-11-16'), 'day', '17', today).value, today)
})
