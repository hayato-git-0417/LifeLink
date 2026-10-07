// 設定（デザイン p.15）。プロフィール変更／目標の設定／ログアウト。
// 変更画面で保存すると、ここに戻って「保存しました」を出す（location.state.message）
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import styles from './Settings.module.css'

export default function SettingsPage() {
  const { logout } = useAuth()
  const location = useLocation()
  const message = location.state?.message

  function handleLogout() {
    if (window.confirm('ログアウトしますか？')) logout()
  }

  return (
    <AppShell title="設定" backTo="/">
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
      <nav className={styles.menu}>
        <Link to="/settings/profile" className={styles.item}>
          <span className={styles.icon} aria-hidden="true">
            👤
          </span>
          <span className={styles.label}>プロフィール変更</span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </Link>
        <Link to="/settings/goal" className={styles.item}>
          <span className={styles.icon} aria-hidden="true">
            🎯
          </span>
          <span className={styles.label}>目標の設定</span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </Link>
        <button type="button" className={styles.item} onClick={handleLogout}>
          <span className={styles.icon} aria-hidden="true">
            🚪
          </span>
          <span className={styles.label}>ログアウト</span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </button>
      </nav>
    </AppShell>
  )
}
