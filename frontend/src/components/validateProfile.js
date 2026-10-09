// プロフィールの入力チェック（新規登録②・プロフィール変更）
import { toDateString } from '../lib/format.js'

export function validateProfile(profile) {
  const errors = []
  if (!profile.name.trim()) errors.push('ユーザー名を入力してください')
  if (!profile.birthdate) errors.push('生年月日を入力してください')
  else if (profile.birthdate > toDateString()) errors.push('生年月日は今日より前の日付にしてください')
  return errors
}
