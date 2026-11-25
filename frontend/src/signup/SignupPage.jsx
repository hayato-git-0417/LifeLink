// 新規登録 ①メール → ②プロフィール → ③目標 → ④食事の目標（デザイン p.9〜p.12、spec.md 5章）
// ①〜④の入力はこの画面で持っておき、最後に POST /auth → PUT /goal の順に送る（①の時点ではユーザーを作らない）。
// ①ではメールの重複だけ API で確認する。目標の保存だけ失敗したときは目標設定画面へ移る。
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, clearAuth } from '../api/client.js'
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

const PASSWORD_MIN = 8
export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshMe } = useAuth()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false) //「通信などの処理中です」という状態に切り替える命令、true になるとボタンが押せなくなり、連打による二重送信を防げる
  const [resumingSignup, setResumingSignup] = useState(false)
  const [account, setAccount] = useState({ password: '', password_confirmation: '' })
  const [showPassword, setShowPassword] = useState(false) // パスワードを隠すやつ false は非表示、true は表示
  const [profile, setProfile] = useState({
    accountId: '',
    icon: 'person_blue',
    name: '',
    birthdate: '',
    gender: '',
    activity_level: '',
    height_cm: '',
    weight_kg: '',
    avatar: null,
    avatarUrl: null,
    useAvatar: false,
    removeAvatar: false,
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
    const accountId = profile.accountId.trim()
    if (!accountId) found.accountId = 'ユーザーIDを入力してください'
    else if (!/^[a-zA-Z0-9_.]{3,20}$/.test(accountId)) found.accountId = 'ユーザーIDは半角英数字とアンダースコアで3〜20文字にしてください'
    if (account.password.length < PASSWORD_MIN) found.password = `パスワードは${PASSWORD_MIN}文字以上にしてください`
    if (account.password !== account.password_confirmation) found.password_confirmation = 'パスワード（確認用）が一致しません'
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    setResumingSignup(false)
    try {
      const data = await api('/registrations/account_id_available', { params: { account_id: accountId } })
      if (!data.available) {
        try {
          await api('/auth/sign_in', {
            method: 'POST',
            body: { account_id: accountId, password: account.password },
          })
          const current = await api('/me')
          if (current.user?.goal_registered) {
            clearAuth()
            setFieldErrors({ accountId: 'このユーザーIDはすでに使われています' })
            return
          }
          setProfile((previous) => ({
            ...previous,
            accountId: current.user.account_id || '',
            icon: current.user.icon,
            name: current.user.name,
            birthdate: current.user.birthdate,
            gender: current.user.gender,
            height_cm: current.user.height_cm ?? '',
            weight_kg: current.user.weight_kg ?? '',
            activity_level: current.user.activity_level || 'moderate',
            avatar: null,
            avatarUrl: current.user.avatar_url || null,
            useAvatar: Boolean(current.user.avatar_selected),
            removeAvatar: false,
          }))
          setResumingSignup(true)
          go(2)
        } catch {
          clearAuth()
          setFieldErrors({ accountId: 'このユーザーIDはすでに使われています' })
        }
        return
      }
      go(2)
    } catch (error) {
      if (error.status === 422) setFieldErrors({ accountId: error.messages })
      else setErrors(error.messages)
    } finally { //  通信に失敗した場合
      setBusy(false)
    }
  }

  function submitProfile(event) {
    event.preventDefault()
    const found = validateProfileFields(profile)
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return
    go(3)
  }

  function submitBasics(event) {
    event.preventDefault()
    const found = validateBasics(goal, true)
    setErrors([])
    setFieldErrors(found)
    if (Object.keys(found).length) return
    go(4)
  }

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
      const formData = new FormData()
      formData.append('password', account.password)
      formData.append('password_confirmation', account.password_confirmation)
      formData.append('account_id', profile.accountId.trim())
      formData.append('name', profile.name.trim())
      formData.append('icon', profile.icon)
      formData.append('birthdate', profile.birthdate)
      formData.append('gender', profile.gender)
      formData.append('height_cm', profile.height_cm)
      formData.append('weight_kg', profile.weight_kg)
      formData.append('activity_level', profile.activity_level)
      if (profile.avatar && profile.useAvatar) formData.append('avatar', profile.avatar)
      if (!resumingSignup) {
        try {
          await api('/auth', { method: 'POST', body: formData })
        } catch (createError) {
          const duplicateAccountId = createError.status === 422
            && createError.messages?.some((message) => /(ユーザーID|account_id|account id).*(存在|登録|使用|already|taken|重複)/i.test(message))
          if (!duplicateAccountId) throw createError

          // 前回の登録が途中で止まり、ユーザーだけ作成済みなら同じ認証情報で続きを行う
          try {
            await api('/auth/sign_in', {
              method: 'POST',
              body: { account_id: profile.accountId.trim(), password: account.password },
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
      setResumingSignup(true)
      // 新規登録画面で確定したアイコンをユーザープロフィールにも保存し、設定画面で同じ表示にする
      const profileData = new FormData()
      profileData.append('user[account_id]', profile.accountId.trim())
      profileData.append('user[name]', profile.name.trim())
      profileData.append('user[icon]', profile.icon)
      profileData.append('user[birthdate]', profile.birthdate)
      profileData.append('user[gender]', profile.gender)
      profileData.append('user[height_cm]', profile.height_cm)
      profileData.append('user[weight_kg]', profile.weight_kg)
      profileData.append('user[activity_level]', profile.activity_level)
      profileData.append('user[avatar_selected]', String(Boolean(profile.useAvatar)))
      if (profile.avatar && profile.useAvatar) {
        profileData.append('user[avatar]', profile.avatar)
      }
      if (profile.removeAvatar) {
        profileData.append('user[remove_avatar]', 'true')
      }
      await api('/me', { method: 'PATCH', body: profileData })
    } catch (error) {
      const fields = error.fieldErrors || {}
      if (Object.keys(fields).length) {
        const accountFields = ['accountId', 'account_id', 'password', 'password_confirmation']
        go(Object.keys(fields).some((key) => accountFields.includes(key)) ? 1 : 2)
        setFieldErrors(fields)
        setErrors(fields.base || [])
      } else setErrors(error.messages || [error.message || '登録に失敗しました'])
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
      {step !== 4 && <ErrorList errors={errors} />}

      {step === 1 && (
        <form className={styles.form} onSubmit={submitAccount} noValidate>
          <section className={`${styles.card} ${styles.form}`}>
            <label className={styles.field}>
              <span className={styles.label}>ユーザーID</span>
              <input
                className={styles.input}
                type="text"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_.]{3,20}"
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="LifeLink_01"
                aria-invalid={Boolean(fieldErrors.accountId)}
                aria-describedby={fieldErrors.accountId ? 'accountId-error' : undefined}
                value={profile.accountId}
                onChange={(event) => setProfile((current) => ({ ...current, accountId: event.target.value }))}
                required
              />
              <FieldError errors={fieldErrors} name="accountId" />
              <span className={styles.hint}>半角英数字、_ (アンダーバー) 、. (ドット)が使えます（3〜20文字）</span>
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
          <ProfileFields showAccountId={false} errors={fieldErrors} value={profile} onChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} />
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
