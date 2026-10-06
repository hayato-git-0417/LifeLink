// 新規登録 ①メール → ②プロフィール → ③目標 → ④食事の目標（デザイン p.9〜p.12、spec.md 5章）
// ①〜④の入力はこの画面で持っておき、最後に POST /auth → PUT /goal の順に送る（①の時点ではユーザーを作らない）。
// ①ではメールの重複だけ API で確認する。目標の保存だけ失敗したときは目標設定画面へ移る。
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import AppShell from '../components/AppShell.jsx'
import ErrorList from '../components/ErrorList.jsx'
import { UserIconPicker } from '../components/UserIcon.jsx'
import GoalBasicsForm from '../goal/GoalBasicsForm.jsx'
import { applyNutritionDefaults, newGoalDraft, toGoalPayload, validateBasics, validateMeals } from '../goal/goalDraft.js'
import MealGoalForm from '../goal/MealGoalForm.jsx'
import styles from '../styles/form.module.css'
import StepIndicator from './StepIndicator.jsx'
import signup from './Signup.module.css'

const PASSWORD_MIN = 6
const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'unspecified', label: '回答しない' },
]

function today() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshMe } = useAuth()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [account, setAccount] = useState({ email: '', password: '', password_confirmation: '' })
  const [profile, setProfile] = useState({ icon: 'person_blue', name: '', birthdate: '', gender: 'unspecified' })
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
        setErrors(['このメールアドレスはすでに登録されています'])
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
    const found = []
    if (!profile.name.trim()) found.push('ユーザー名を入力してください')
    if (!profile.birthdate) found.push('生年月日を入力してください')
    else if (profile.birthdate > today()) found.push('生年月日は今日より前の日付にしてください')
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
      await api('/auth', {
        method: 'POST',
        body: { ...account, email: account.email.trim(), ...profile, name: profile.name.trim() },
      })
    } catch (error) {
      setErrors(error.messages)
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
          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={busy}>
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
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>アイコンを選択</h3>
            <UserIconPicker value={profile.icon} onChange={(icon) => setProfile({ ...profile, icon })} />
          </section>
          <label className={`${styles.card} ${styles.field}`}>
            <span className={styles.cardTitle}>ユーザー名</span>
            <input
              className={styles.input}
              type="text"
              maxLength={50}
              placeholder="名前を入力"
              autoComplete="nickname"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>生年月日</span>
            <input
              className={`${styles.input} ${signup.birthdate}`}
              type="date"
              min="1900-01-01"
              max={today()}
              value={profile.birthdate}
              onChange={(event) => setProfile({ ...profile, birthdate: event.target.value })}
            />
          </label>
          <fieldset className={styles.field}>
            <legend className={styles.label}>性別（食事の目標の初期値に使います）</legend>
            <div className={signup.genders}>
              {GENDERS.map(({ value, label }) => (
                <label key={value} className={styles.radio}>
                  <input
                    type="radio"
                    name="gender"
                    checked={profile.gender === value}
                    onChange={() => setProfile({ ...profile, gender: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={`${styles.actions} ${styles.actionsBetween}`}>
            <button className={styles.button} type="button" onClick={() => go(1)}>
              戻る
            </button>
            <button className={styles.button} type="submit">
              次へ
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className={styles.form} onSubmit={submitBasics} noValidate>
          <h2 className={signup.heading}>目標設定</h2>
          <GoalBasicsForm value={goal} onChange={updateGoal} />
          <div className={`${styles.actions} ${styles.actionsBetween}`}>
            <button className={styles.button} type="button" onClick={() => go(2)}>
              戻る
            </button>
            <button className={styles.button} type="submit">
              次へ
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form className={styles.form} onSubmit={submitAll} noValidate>
          <h2 className={signup.heading}>食事の目標</h2>
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
