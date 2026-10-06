// ログイン（デザイン p.8）。新規登録へのリンクを追加（spec.md 5章【仮】）
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
    <AppShell title="ログイン" guest>
      <form className={`${styles.form} ${page.form}`} onSubmit={handleSubmit} noValidate>
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
        <div className={`${styles.actions} ${styles.actionsCenter} ${page.submit}`}>
          <button className={styles.button} type="submit" disabled={submitting || !email || !password}>
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </div>
        <p className={page.signup}>
          はじめての方は <Link to="/signup">新規登録</Link>
        </p>
      </form>
    </AppShell>
  )
}
