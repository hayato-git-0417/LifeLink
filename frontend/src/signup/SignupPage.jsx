// 新規登録 ①メール → ②プロフィール → ③目標 → ④食事の目標（デザイン p.9〜p.12、spec.md 5章）
// ①〜④の入力はこの画面で持っておき、最後に POST /auth → PUT /goal の順に送る（①の時点ではユーザーを作らない）。
// ①ではメールの重複だけ API で確認する。目標の保存だけ失敗したときは目標設定画面へ移る。
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import AppShell from '../components/AppShell.jsx'
import FieldError from '../components/FieldError.jsx'
import ErrorList from '../components/ErrorList.jsx'
import ProfileFields from '../components/ProfileFields.jsx'
import { validateProfileFields } from '../components/validateProfile.js'
import GoalBasicsForm from '../goal/GoalBasicsForm.jsx'
import { applyNutritionDefaults, newGoalDraft, toGoalPayload, validateBasics, validateMeals } from '../goal/goalDraft.js'
import MealGoalForm from '../goal/MealGoalForm.jsx'
import styles from '../styles/form.module.css'
import StepIndicator from './StepIndicator.jsx'
import signup from './Signup.module.css'

const PASSWORD_MIN = 8 // パスワードの最低文字数
export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshMe } = useAuth()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false) //「通信などの処理中です」という状態に切り替える命令、true になるとボタンが押せなくなり、連打による二重送信を防げる
  const [account, setAccount] = useState({ email: '', password: '', password_confirmation: '' })
  const [showPassword, setShowPassword] = useState(false) // パスワードを隠すやつ false は非表示、true は表示
  const [profile, setProfile] = useState({
    icon: 'person_blue',
    name: '',
    birthdate: '',
    gender: '',
    activity_level: '',
    height_cm: '',
    weight_kg: '',
  })
  const [goal, setGoal] = useState(newGoalDraft)
  // 栄養目標の初期値を出した「生年月日・性別」。②を変えたら④で出し直す
  const [defaultsKey, setDefaultsKey] = useState(null)
  const [basis, setBasis] = useState(null)

  useEffect(() => {
    const first = document.getElementById(Object.keys(fieldErrors)[0] + '-error')
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [fieldErrors])

  const updateGoal = (changes) => setGoal((current) => ({ ...current, ...changes }))

  /* ページを切り替える関数 */
  function go(nextStep) {
    setErrors([]) // 前のエラーメッセージを消す
    setFieldErrors({})
    setStep(nextStep) // 表示するステップを次に変更
    window.scrollTo(0, 0) // 画面を一番上までスクロール
  }

  // ④を開いたら、年齢・性別から栄養目標の初期値を出す（ログイン前なので生年月日・性別を渡す）
  async function loadDefaults(force = false) {
    const key = [profile.birthdate, profile.gender, profile.height_cm, profile.weight_kg, profile.activity_level].join('/')
    if (!force && key === defaultsKey) return
    setBusy(true)
    try {
      const inputs = { birthdate: profile.birthdate, gender: profile.gender, height_cm: profile.height_cm, weight_kg: profile.weight_kg, activity_level: profile.activity_level }
      const data = await api('/goal/nutrition_suggestion', { method: 'POST', body: inputs })
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


  /*「次へ」を押してフォームを送信したときの処理 */
  async function submitAccount(event) {
    event.preventDefault()  //  ブラウザ標準のフォーム送信によるページ移動・再読み込みを防ぐ処理
    const found = {}

    //.test(account.password)：パスワードの中に、そのパターンに当てはまる部分があるか確認する
    const hasLetter = /[a-zA-Z]/.test(account.password)
    const hasNumber = /[0-9]/.test(account.password)
    if (!hasLetter || !hasNumber) {
      found.password = 'パスワードは英字と数字をそれぞれ1文字以上含めてください'
    }

    // 項目ごとにエラーメッセージを設定する
    if (!account.email.trim()) found.email = 'メールアドレスを入力してください'
    if (account.password.length < PASSWORD_MIN) found.password = `パスワードは${PASSWORD_MIN}文字以上にしてください`
    if (account.password !== account.password_confirmation) found.password_confirmation = 'パスワード（確認用）が一致しません'
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return

    setBusy(true) //  送信ボタンを押せなくする
    // 入力されたメールアドレスが登録に使えるかをRailsに問い合わせ、返ってきた結果を data に入れる処理
    try {
      const data = await api('/registrations/email_available', { params: { email: account.email.trim() } })
      if (!data.available) {
        setFieldErrors({ email: 'このメールアドレスはすでに登録されています' })
        return
      }
      go(2) // 新規登録の2つ目の画面へ切り替える
    } catch (error) {
      if (error.status === 422) setFieldErrors({ email: error.messages })
      else setErrors(error.messages)
    } finally { //  通信に失敗した場合
      setBusy(false)
    }
  }

  /* 名前や生年月日などを、フロント側でチェックする */
  function submitProfile(event) {
    event.preventDefault()
    const found = validateProfileFields(profile)
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return
    go(3)
  }

  /* 睡眠・ワーク・運動の目標を、フロント側でチェックする */
  function submitBasics(event) {
    event.preventDefault()
    const found = validateBasics(goal, true)
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return
    go(4)
  }

  /* 最後の画面で登録ボタンを押したときに、Railsと通信して登録を完了する処理 */
  async function submitAll(event) {
    event.preventDefault() // .preventDefault ブラウザが標準で行う動作を止める
    const found = validateMeals(goal, true) // 食事の目標をチェックする
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    setErrors([])
    try {
      // ユーザーを作る（キャラもサーバーで作られる）。トークンは api() が保存する
      await api('/auth', {
        method: 'POST',
        body: { ...account, email: account.email.trim(), ...profile, name: profile.name.trim() },
      })
    } catch (error) {
      const fields = error.fieldErrors || {}
      if (Object.keys(fields).length) {
        const accountFields = ['email', 'password', 'password_confirmation']
        go(Object.keys(fields).some((key) => accountFields.includes(key)) ? 1 : 2)
        setFieldErrors(fields)
        setErrors(fields.base || [])
      } else setErrors(error.messages)
      setBusy(false)
      return
    }

    try {
      // 目標を保存する
      await api('/goal', { method: 'PUT', body: toGoalPayload(goal) })
      await refreshMe()
      navigate('/', { replace: true })
    } catch (error) {
      // ログイン中のユーザー情報を取得し、ホームへ移動する
      await refreshMe().catch(() => {})
      navigate('/goal-setup', { replace: true, state: { draft: goal, errors: error.messages } })
    }
  }

  return (
    <AppShell title="新規登録" guest>
      <StepIndicator current={step} />
      {step !== 4 && <ErrorList errors={errors} />}

      {step === 1 && (
        <form className={styles.form} onSubmit={submitAccount} noValidate>
          <section className={`${styles.card} ${styles.form}`}>
            <label className={styles.field}>
              <span className={styles.label}>メールアドレス</span>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="例：name@example.com"  // emailのプレースホルダ
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                value={account.email}
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
              />
              <FieldError errors={fieldErrors} name="email" />
            </label>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                パスワード
              </label>

              <div className={signup.passwordWrap}>
                <input
                  id="password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  value={account.password}
                  onChange={(event) =>
                    setAccount({ ...account, password: event.target.value })
                  }
                />
                <button
                  className={signup.passwordToggle}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? 'パスワードを隠す' : 'パスワードを表示する'
                  }
                >
                  <img src={showPassword ? '../icons/eye-open.svg' : '../icons/eye-closed.svg'} alt="" width="24" height="24"/>
                </button>
              </div>
              <FieldError errors={fieldErrors} name="password" />

              <span className={styles.hint}>
                {PASSWORD_MIN}文字以上・半角英字と数字を両方含む（記号使用可）
              </span>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>パスワード（確認用）</span>
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password_confirmation)}
                aria-describedby={fieldErrors.password_confirmation ? 'password_confirmation-error' : undefined}
                value={account.password_confirmation}
                onChange={(event) => setAccount({ ...account, password_confirmation: event.target.value })}
              />
              <FieldError errors={fieldErrors} name="password_confirmation" />
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
          <ProfileFields errors={fieldErrors} value={profile} onChange={(changes) => setProfile({ ...profile, ...changes })} />
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
          <GoalBasicsForm errors={fieldErrors} value={goal} onChange={updateGoal} />
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
          <ErrorList errors={errors} />
          <MealGoalForm
            errors={fieldErrors}
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
