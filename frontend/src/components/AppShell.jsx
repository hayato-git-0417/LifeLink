// 画面の共通の枠: 上部ヘッダー（戻る・タイトル・通知ベル・メニュー）と下部ナビ（ホーム／マイページ）。
// クリームの帯にココアの線、ボタンは丸く縁どる（キャラの線画に合わせる）。
//   <AppShell title="新規登録" guest>...</AppShell>  … ベル・メニュー・下部ナビを出さない（ログイン・新規登録。spec.md 5章）
//   <AppShell title="食事" backTo="/">...</AppShell>  … 左上に戻るボタン
//   <AppShell bare>...</AppShell>  … ヘッダーも下部ナビも出さず、中身だけを画面いっぱいに描く（ホーム・ログイン）
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import styles from './AppShell.module.css'
import { BackIcon, BellIcon, ChartIcon, DoorIcon, GearIcon, HomeIcon, MenuIcon, PersonIcon } from './icons.jsx'

export default function AppShell({ title, guest = false, backTo, bare = false, children }) {
  if (bare) return <div className={styles.frame}>{children}</div>
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <span className={styles.side}>
          {backTo && (
            <Link to={backTo} className={styles.roundButton} aria-label="戻る" data-label="戻る" title="戻る">
              <BackIcon size={22} />
            </Link>
          )}
        </span>
        <h1 className={styles.title}>{title}</h1>
        <span className={`${styles.side} ${styles.actions}`}>{!guest && <HeaderActions />}</span>
      </header>
      <main className={`${styles.main} ${guest ? '' : styles.withNav}`}>{children}</main>
      {!guest && <BottomNav />}
    </div>
  )
}

// 通知ベル（未読数）とメニュー。ホームの右上でも使う
export function HeaderActions({ showCustomize = false }) {
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
      {showCustomize && (
        <Link
          to="/home/customize/edit"
          className={styles.roundButton}
          aria-label="模様替え"
          data-label="模様替え"
          title="模様替え"
        >
          <HomeIcon size={22} />
        </Link>
      )}
      <Link
        to="/notifications"
        className={styles.roundButton}
        aria-label={`通知（未読 ${unreadCount} 件）`}
        data-label="通知"
        title="通知"
      >
        <BellIcon size={22} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </Link>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={styles.roundButton}
          aria-label="メニュー"
          data-label="メニュー"
          title="メニュー"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon size={22} />
        </button>
        {open && (
          <nav className={styles.menu} onClick={() => setOpen(false)}>
            <Link to="/details">
              <ChartIcon size={20} />
              記録の詳細
            </Link>
            <Link to="/settings">
              <GearIcon size={20} />
              設定
            </Link>
            <button type="button" className={styles.logout} onClick={logout}>
              <DoorIcon size={20} />
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
        <span className={styles.navIcon}>
          <HomeIcon size={22} />
        </span>
        ホーム
      </NavLink>
      <NavLink to="/mypage" className={linkClass}>
        <span className={styles.navIcon}>
          <PersonIcon size={22} />
        </span>
        マイページ
      </NavLink>
    </nav>
  )
}
