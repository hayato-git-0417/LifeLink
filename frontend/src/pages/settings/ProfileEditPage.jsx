// プロフィール変更（デザイン p.16）。アイコン・名前・生年月日・性別（新規登録②と同じ部品）。
// メール・パスワードはここでは変えない
import { useEffect, useState } from 'react'
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
    avatar: null,
    avatarUrl: user.avatar_url || null,
    useAvatar: Boolean(user.avatar_selected),
    removeAvatar: false,
  }))
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    refreshMe()
      .then((freshUser) => {
        if (!active) return
        setProfile((current) => ({
          ...current,
          icon: freshUser.icon,
          birthdate: freshUser.birthdate,
          avatarUrl: current.avatar ? current.avatarUrl : freshUser.avatar_url || null,
          useAvatar: current.avatar
            ? current.useAvatar
            : current.removeAvatar
              ? false
              : Boolean(freshUser.avatar_selected),
        }))
      })
      .catch(() => {})
    return () => { active = false }
  }, [refreshMe])

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateProfileFields(profile)
    setFieldErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setErrors([])
    try {
      const formData = new FormData()
      formData.append('user[name]', profile.name.trim())
      formData.append('user[icon]', profile.icon)
      formData.append('user[birthdate]', profile.birthdate)
      formData.append('user[gender]', profile.gender)
      formData.append('user[height_cm]', profile.height_cm)
      formData.append('user[weight_kg]', profile.weight_kg)
      formData.append('user[activity_level]', profile.activity_level)
      formData.append('user[avatar_selected]', String(Boolean(profile.useAvatar)))
      if (profile.avatar) formData.append('user[avatar]', profile.avatar)
      if (profile.removeAvatar) formData.append('user[remove_avatar]', 'true')
      const saved = await api('/me', { method: 'PATCH', body: formData })
      if (Boolean(saved.user?.avatar_selected) !== Boolean(profile.useAvatar)) {
        throw new Error('写真アイコンの選択状態を保存できませんでした。Railsの再起動と db:migrate の実行を確認してください。')
      }
      const freshUser = await refreshMe()
      if (Boolean(freshUser.avatar_selected) !== Boolean(profile.useAvatar)) {
        throw new Error('保存後のアイコン選択状態を読み戻せませんでした。Railsを再起動してからもう一度お試しください。')
      }
      navigate('/settings', { replace: true, state: { message: 'プロフィールを保存しました' } })
    } catch (error) {
      setErrors(error.messages || [error.message || 'プロフィールを保存できませんでした'])
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
