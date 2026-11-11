// 新規登録 ①メール → ②プロフィール → ③目標 → ④食事の目標（デザイン p.9〜p.12、spec.md 5章）
// ①〜④の入力はこの画面で持っておき、最後に POST /auth → PUT /goal の順に送る（①の時点ではユーザーを作らない）。
// ①ではメールの重複だけ API で確認する。目標の保存だけ失敗したときは目標設定画面へ移る。
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, clearAuth } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import AppShell from '../components/AppShell.jsx'
import ErrorList from '../components/ErrorList.jsx'
import ProfileFields from '../components/ProfileFields.jsx'
import { validateProfile } from '../components/validateProfile.js'
import GoalBasicsForm from '../goal/GoalBasicsForm.jsx'
import { applyNutritionDefaults, newGoalDraft, toGoalPayload, validateBasics, validateMeals } from '../goal/goalDraft.js'
import MealGoalForm from '../goal/MealGoalForm.jsx'
import styles from '../styles/form.module.css'
import StepIndicator from './StepIndicator.jsx'
import signup from './Signup.module.css'

const PASSWORD_MIN = 6
export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshMe } = useAuth()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [resumingSignup, setResumingSignup] = useState(false)
  const [account, setAccount] = useState({ email: '', password: '', password_confirmation: '' })
  const [profile, setProfile] = useState({ icon: 'person_blue', name: '', birthdate: '', gender: 'unspecified', avatar: null, avatarUrl: null, useAvatar: false, removeAvatar: false })
  const [goal, setGoal] = useState(newGoalDraft)
  // 栄養目標の初期値を出した「生年月日・性別」。②を変えたら④で出し直す
  const [defaultsKey, setDefaultsKey] = useState(null)
  const [basis, setBasis] = useState(null)

  const updateGoal = (changes) => setGoal((current) => ({ ...current, ...changes }))

  function go(nextStep) {
    setErrors([])
    setStep(nextStep)
    window.scrollTo(0, 0)
  }

  // ④を開いたら、年齢・性別から栄養目標の初期値を出す（ログイン前なので生年月日・性別を渡す）
  async function loadDefaults(force = false) {
    const key = `${profile.birthdate}/${profile.gender}`
    if (!force && key === defaultsKey) return
    setBusy(true)
    try {
      const data = await api('/goal/nutrition_defaults', {
        params: { birthdate: profile.birthdate, gender: profile.gender },
      })
      setGoal((current) => applyNutritionDefaults(current, data.nutrition_defaults))
      setBasis(data.nutrition_defaults.basis)
      setDefaultsKey(key)
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (step === 4) loadDefaults()
    // ④に入ったときだけ呼ぶ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function submitAccount(event) {
    event.preventDefault()
    const found = []
    if (!account.email.trim()) found.push('メールアドレスを入力してください')
    if (account.password.length < PASSWORD_MIN) found.push(`パスワードは${PASSWORD_MIN}文字以上にしてください`)
    if (account.password !== account.password_confirmation) found.push('パスワード（確認用）が一致しません')
    if (found.length) return setErrors(found)

    setBusy(true)
    try {
      const data = await api('/registrations/email_available', { params: { email: account.email.trim() } })
      if (!data.available) {
        try {
          await api('/auth/sign_in', {
            method: 'POST',
            body: { email: account.email.trim(), password: account.password },
          })
          const current = await api('/me')
          if (current.user?.goal_registered) {
            clearAuth()
            setErrors(['このメールアドレスはすでに登録されています'])
            return
          }
          setProfile((previous) => ({
            ...previous,
            icon: current.user.icon,
            name: current.user.name,
            birthdate: current.user.birthdate,
            gender: current.user.gender,
            avatarUrl: current.user.avatar_url || null,
            useAvatar: Boolean(current.user.avatar_url),
          }))
          setResumingSignup(true)
          go(2)
        } catch {
          clearAuth()
          setErrors(['このメールアドレスはすでに登録されています'])
        }
        return
      }
      go(2)
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusy(false)
    }
  }

  function submitProfile(event) {
    event.preventDefault()
    const found = validateProfile(profile)
    if (found.length) return setErrors(found)
    go(3)
  }

  function submitBasics(event) {
    event.preventDefault()
    const found = validateBasics(goal)
    if (found.length) return setErrors(found)
    go(4)
  }

  async function submitAll(event) {
    event.preventDefault()
    const found = validateMeals(goal)
    if (found.length) return setErrors(found)

    setBusy(true)
    setErrors([])
    try {
      // ユーザーを作る（キャラもサーバーで作られる）。トークンは api() が保存する
      const formData = new FormData()
      formData.append('email', account.email.trim())
      formData.append('password', account.password)
      formData.append('password_confirmation', account.password_confirmation)
      formData.append('name', profile.name.trim())
      formData.append('icon', profile.icon)
      formData.append('birthdate', profile.birthdate)
      formData.append('gender', profile.gender)
      if (profile.avatar && profile.useAvatar) formData.append('avatar', profile.avatar)
      if (!resumingSignup) {
        try {
          await api('/auth', { method: 'POST', body: formData })
        } catch (createError) {
          const duplicateEmail = createError.status === 422
            && createError.messages?.some((message) => /(メールアドレス|email).*(存在|登録|使用|already|taken)/i.test(message))
          if (!duplicateEmail) throw createError

          // 前回の登録が途中で止まり、ユーザーだけ作成済みなら同じ認証情報で続きを行う
          try {
            await api('/auth/sign_in', {
              method: 'POST',
              body: { email: account.email.trim(), password: account.password },
            })
            const current = await api('/me')
            if (current.user?.goal_registered) {
              clearAuth()
              throw createError
            }
          } catch {
            clearAuth()
            throw createError
          }
        }
      }
      // 新規登録画面で確定したアイコンをユーザープロフィールにも保存し、設定画面で同じ表示にする
      const profileData = new FormData()
      profileData.append('user[icon]', profile.icon)
      if (profile.avatar && profile.useAvatar) profileData.append('user[avatar]', profile.avatar)
      if (profile.removeAvatar || (!profile.useAvatar && profile.avatarUrl)) profileData.append('user[remove_avatar]', 'true')
      await api('/me', { method: 'PATCH', body: profileData })
    } catch (error) {
      setErrors(error.messages || [error.message || '登録に失敗しました'])
      setBusy(false)
      return
    }

    try {
      await api('/goal', { method: 'PUT', body: toGoalPayload(goal) })
      await refreshMe()
      navigate('/', { replace: true })
    } catch (error) {
      // アカウントはできたので、目標設定画面で入力の続きから直してもらう
      await refreshMe().catch(() => {})
      navigate('/goal-setup', { replace: true, state: { draft: goal, errors: error.messages } })
    }
  }

  return (
    <AppShell title="新規登録" guest>
      <StepIndicator current={step} />
      <ErrorList errors={errors} />

      {step === 1 && (
        <form className={styles.form} onSubmit={submitAccount} noValidate>
          <section className={`${styles.card} ${styles.form}`}>
            <label className={styles.field}>
              <span className={styles.label}>メールアドレス</span>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                value={account.email}
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>パスワード</span>
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={account.password}
                onChange={(event) => setAccount({ ...account, password: event.target.value })}
              />
              <span className={styles.hint}>{PASSWORD_MIN}文字以上</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>パスワード（確認用）</span>
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={account.password_confirmation}
                onChange={(event) => setAccount({ ...account, password_confirmation: event.target.value })}
              />
            </label>
          </section>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={busy}>
              {busy ? '確認中…' : '次へ'}
            </button>
          </div>
          <p className={signup.loginLink}>
            登録済みの方は <Link to="/login">ログイン</Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form className={styles.form} onSubmit={submitProfile} noValidate>
          <ProfileFields value={profile} onChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} />
          <div className={`${styles.actions} ${styles.actionsBetween}`}>
            <button className={styles.button} type="button" onClick={() => go(1)}>
              戻る
            </button>
            <button className={`${styles.button} ${styles.primary}`} type="submit">
              次へ
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className={styles.form} onSubmit={submitBasics} noValidate>
          <p className={signup.lead}>理想の生活リズムを決めましょう。キャラはこの目標に沿って暮らします。</p>
          <GoalBasicsForm value={goal} onChange={updateGoal} />
          <div className={`${styles.actions} ${styles.actionsBetween}`}>
            <button className={styles.button} type="button" onClick={() => go(2)}>
              戻る
            </button>
            <button className={`${styles.button} ${styles.primary}`} type="submit">
              次へ
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form className={styles.form} onSubmit={submitAll} noValidate>
          <MealGoalForm
            value={goal}
            onChange={updateGoal}
            basis={basis}
            onResetDefaults={() => loadDefaults(true)}
            loadingDefaults={busy}
          />
          <div className={`${styles.actions} ${styles.actionsBetween}`}>
            <button className={styles.button} type="button" onClick={() => go(3)} disabled={busy}>
              戻る
            </button>
            <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={busy}>
              {busy ? '送信中…' : '登録する'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
