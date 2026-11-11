// プロフィール変更（デザイン p.16）。アイコン・名前・生年月日・性別（新規登録②と同じ部品）。
// メール・パスワードはここでは変えない
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import ProfileFields from '../../components/ProfileFields.jsx'
import { validateProfile } from '../../components/validateProfile.js'
import form from '../../styles/form.module.css'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, refreshMe } = useAuth()
  const [profile, setProfile] = useState(() => ({
    icon: user.icon,
    name: user.name,
    birthdate: user.birthdate,
    gender: user.gender,
    avatar: null,
    avatarUrl: user.avatar_url || null,
    removeAvatar: false,
  }))
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    refreshMe()
      .then((freshUser) => {
        if (!active) return
        setProfile((current) => ({
          ...current,
          icon: freshUser.icon,
          avatarUrl: current.avatar ? current.avatarUrl : freshUser.avatar_url || null,
        }))
      })
      .catch(() => {})
    return () => { active = false }
  }, [refreshMe])

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateProfile(profile)
    if (found.length) return setErrors(found)
    setSaving(true)
    setErrors([])
    try {
      const formData = new FormData()
      formData.append('user[name]', profile.name.trim())
      formData.append('user[icon]', profile.icon)
      formData.append('user[birthdate]', profile.birthdate)
      formData.append('user[gender]', profile.gender)
      if (profile.avatar) formData.append('user[avatar]', profile.avatar)
      if (profile.removeAvatar) formData.append('user[remove_avatar]', 'true')
      await api('/me', { method: 'PATCH', body: formData })
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
        <ProfileFields value={profile} onChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} />
        <p className={form.hint}>生年月日・性別を変えても、食事の目標は変わりません。変えるときは「目標の設定」で初期値を出し直してください。</p>
        <button type="submit" className={`${form.button} ${form.primary} ${form.block}`} disabled={saving}>
          {saving ? '保存中…' : '変更を保存する'}
        </button>
      </form>
    </AppShell>
  )
}

