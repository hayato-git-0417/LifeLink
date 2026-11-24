import { toDateString } from '../lib/format.js'
export function validateProfileFields(profile) {
  const errors = {}
  if (!profile.name.trim()) errors.name = 'ユーザー名を入力してください'
  if (!profile.birthdate) errors.birthdate = '生年月日を入力してください'
  else if (profile.birthdate > toDateString()) errors.birthdate = '生年月日は今日以前の日付にしてください'
  if (!['male', 'female'].includes(profile.gender)) errors.gender = '性別を選択してください'
  if (!['low', 'moderate', 'high'].includes(profile.activity_level)) errors.activity_level = '普段の活動量を選択してください'
  for (const [key, label] of [['height_cm', '身長'], ['weight_kg', '体重']]) {
    if (profile[key] == null || String(profile[key]).trim() === '') errors[key] = label + 'を入力してください'
    else if (!Number.isFinite(Number(profile[key])) || Number(profile[key]) <= 0 || Number(profile[key]) >= 1000) errors[key] = label + 'は0より大きく1000未満の数値で入力してください'
  }
  return errors
}
export function validateProfile(profile) { return Object.values(validateProfileFields(profile)) }
