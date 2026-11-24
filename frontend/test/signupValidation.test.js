import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateProfileFields } from '../src/components/validateProfile.js'
import { newGoalDraft, validateBasics, validateMeals } from '../src/goal/goalDraft.js'

const profile = { name: 'テスト', birthdate: '2000-01-01', gender: 'male', activity_level: 'moderate', height_cm: '170', weight_kg: '65' }

test('必須プロフィールの未入力を項目ごとに返す', () => {
  assert.deepEqual(validateProfileFields(profile), {})
  for (const key of ['name', 'birthdate', 'gender', 'height_cm', 'weight_kg', 'activity_level']) {
    assert.ok(validateProfileFields({ ...profile, [key]: '' })[key])
  }
})

test('削除した性別・未来の生年月日・不正な身長体重を拒否する', () => {
  for (const gender of ['other', 'unspecified']) assert.ok(validateProfileFields({ ...profile, gender }).gender)
  assert.ok(validateProfileFields({ ...profile, birthdate: '2999-01-01' }).birthdate)
  for (const key of ['height_cm', 'weight_kg']) {
    for (const value of ['0', '-1', 'Infinity', 'abc', '1000']) {
      assert.ok(validateProfileFields({ ...profile, [key]: value })[key])
    }
  }
})

test('生活目標と食事目標のエラーを表示する項目に対応付ける', () => {
  const basics = validateBasics({ ...newGoalDraft(), sleep_hours: '', work_hours: '' }, true)
  assert.deepEqual(Object.keys(basics), ['sleep', 'tasks', 'work'])
  assert.deepEqual(Object.keys(validateMeals(newGoalDraft(), true)), ['calorie_goal', 'protein_goal_g', 'fat_goal_g', 'carbs_goal_g'])
  assert.equal(validateBasics(newGoalDraft()).length, 1)
})
