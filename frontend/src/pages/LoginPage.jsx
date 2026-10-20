// ログイン（デザイン p.8）。キャラが出迎える。新規登録へのリンクを追加（spec.md 5章【仮】）
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import AppShell from '../components/AppShell.jsx'
import ErrorList from '../components/ErrorList.jsx'
import styles from '../styles/form.module.css'
import page from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      // 目標が未登録なら RequireUser が目標設定へ回す
      navigate(user.goal_registered ? location.state?.from || '/' : '/goal-setup', { replace: true })
    } catch (error) {
      setErrors(error.messages)
      setSubmitting(false)
    }
  }

  return (
    <AppShell bare>
      <div className={page.screen}>
        <div className={page.hero}>
          <img className={page.character} src="/characters/normal.png" alt="" width="132" height="132" />
          <span className={page.shadow} aria-hidden="true" />
          <p className={page.appName}>LifeLink</p>
          <p className={page.tagline}>キャラといっしょに、生活リズムを整えよう</p>
        </div>

        <form className={`${styles.card} ${styles.form} ${page.form}`} onSubmit={handleSubmit} noValidate>
          <h1 className={page.title}>ログイン</h1>
          <ErrorList errors={errors} />
          <label className={styles.field}>
            <span className={styles.label}>メールアドレス</span>
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>パスワード</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            className={`${styles.button} ${styles.primary} ${styles.block} ${page.submit}`}
            type="submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <p className={page.signup}>
          はじめての方は <Link to="/signup">新規登録</Link>
        </p>
      </div>
    </AppShell>
  )
}
