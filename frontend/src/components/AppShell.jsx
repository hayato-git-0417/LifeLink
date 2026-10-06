// 画面の共通の枠: 上部ヘッダー（タイトル・通知ベル・メニュー≡）と下部ナビ（ホーム／マイページ）。
// ログイン・新規登録の画面は guest にして、ベル・メニュー・下部ナビを出さない（spec.md 5章）。
//   <AppShell title="ログイン" guest>...</AppShell>
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import styles from './AppShell.module.css'

export default function AppShell({ title, guest = false, children }) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <span className={styles.side} />
        <h1 className={styles.title}>{title}</h1>
        <span className={`${styles.side} ${styles.actions}`}>{!guest && <HeaderActions />}</span>
      </header>
      <main className={`${styles.main} ${guest ? '' : styles.withNav}`}>{children}</main>
      {!guest && <BottomNav />}
    </div>
  )
}

function HeaderActions() {
  const { unreadCount, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // メニューの外を押したら閉じる
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <>
      <Link to="/notifications" className={styles.iconButton} aria-label={`通知（未読 ${unreadCount} 件）`}>
        <BellIcon />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </Link>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="メニュー"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon />
        </button>
        {open && (
          <nav className={styles.menu} onClick={() => setOpen(false)}>
            <Link to="/settings">設定</Link>
            <Link to="/notifications">通知</Link>
            <Link to="/details">記録の詳細</Link>
            <button type="button" onClick={logout}>
              ログアウト
            </button>
          </nav>
        )}
      </div>
    </>
  )
}

function BottomNav() {
  const linkClass = ({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`
  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={linkClass}>
        <HomeIcon />
        <span>ホーム</span>
      </NavLink>
      <NavLink to="/mypage" className={linkClass}>
        <PersonIcon />
        <span>マイページ</span>
      </NavLink>
    </nav>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
      />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <rect x="3" y="5" width="18" height="3" rx="1.5" fill="currentColor" />
      <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="currentColor" />
      <rect x="3" y="16" width="18" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path fill="currentColor" d="M12 3 2 11.5l1.3 1.5L5 11.6V21h5.5v-6h3v6H19v-9.4l1.7 1.4 1.3-1.5L12 3Z" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <circle cx="12" cy="8" r="4.5" fill="currentColor" />
      <path fill="currentColor" d="M3 21c0-4.4 4-7.5 9-7.5s9 3.1 9 7.5v1H3v-1Z" />
    </svg>
  )
}
