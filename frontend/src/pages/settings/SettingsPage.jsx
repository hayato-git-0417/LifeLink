// 設定（デザイン p.15）。プロフィール変更／目標の設定／ログアウト。
// 変更画面で保存すると、ここに戻って「保存しました」を出す（location.state.message）
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import { ChevronRightIcon, DoorIcon, FlagIcon, PersonIcon } from '../../components/icons.jsx'
import form from '../../styles/form.module.css'
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
        <p className={`${form.notice} ${styles.message}`} role="status">
          {message}
        </p>
      )}
      <nav className={`${form.card} ${styles.menu}`}>
        <Link to="/settings/profile" className={styles.item}>
          <IconBadge>
            <PersonIcon size={20} />
          </IconBadge>
          <span className={styles.label}>プロフィール変更</span>
          <ChevronRightIcon size={18} className={styles.chevron} />
        </Link>
        
        <Link to="/settings/goal" className={styles.item}>
          <IconBadge tone="leaf">
            <FlagIcon size={20} />
          </IconBadge>
          <span className={styles.label}>目標の設定</span>
          <ChevronRightIcon size={18} className={styles.chevron} />
        </Link>

        <Link to="/settings/sound" className={styles.item}>
          <IconBadge tone="leaf">
            <FlagIcon size={20} />
          </IconBadge>
          <span className={styles.label}>サウンド</span>
          <ChevronRightIcon size={18} className={styles.chevron} />
        </Link>
        
        <button type="button" className={styles.item} onClick={handleLogout}>
          <IconBadge>
            <DoorIcon size={20} />
          </IconBadge>
          <span className={styles.label}>ログアウト</span>
          <ChevronRightIcon size={18} className={styles.chevron} />
        </button>
      </nav>
    </AppShell>
  )
}
