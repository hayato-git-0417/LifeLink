// プロフィール変更（デザイン p.16）。アイコン・名前・生年月日・性別（新規登録②と同じ部品）。
// メール・パスワードはここでは変えない
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import ProfileFields from '../../components/ProfileFields.jsx'
import { validateProfileFields } from '../../components/validateProfile.js'
import form from '../../styles/form.module.css'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, refreshMe } = useAuth()
  const [profile, setProfile] = useState(() => ({
    icon: user.icon,
    name: user.name,
    birthdate: user.birthdate,
    gender: user.gender,
    activity_level: user.activity_level || 'moderate',
    height_cm: user.height_cm ?? "",
    weight_kg: user.weight_kg ?? "",
  }))
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateProfileFields(profile)
    setFieldErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setErrors([])
    try {
      await api('/me', { method: 'PATCH', body: { user: { ...profile, name: profile.name.trim() } } })
      await refreshMe()
      navigate('/settings', { replace: true, state: { message: 'プロフィールを保存しました' } })
    } catch (error) {
      setErrors(error.messages)
      setSaving(false)
    }
  }

  return (
    <AppShell title="プロフィール変更" backTo="/settings">
      <form className={form.form} onSubmit={handleSubmit} noValidate>
        <ErrorList errors={errors} />
        <ProfileFields errors={fieldErrors} value={profile} onChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} />
        <p className={form.hint}>生年月日・体格・活動量を変えても、食事の目標は変わりません。変えるときは「目標の設定」で初期値を出し直してください。</p>
        <button type="submit" className={`${form.button} ${form.primary} ${form.block}`} disabled={saving}>
          {saving ? '保存中…' : '変更を保存する'}
        </button>
      </form>
    </AppShell>
  )
}
