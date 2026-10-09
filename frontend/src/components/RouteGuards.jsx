// 画面の振り分け
//   RequireUser: ログインが必要。未ログインならログインへ。目標が未登録なら目標設定へ（spec.md 5章）
//   GuestOnly:   ログイン・新規登録。ログイン中ならホームへ
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import styles from '../styles/form.module.css'

export const GOAL_SETUP_PATH = '/goal-setup'

function Loading() {
  return <p className={styles.loading}>読み込み中…</p>
}

export function RequireUser() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Loading />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user.goal_registered && location.pathname !== GOAL_SETUP_PATH) {
    return <Navigate to={GOAL_SETUP_PATH} replace />
  }
  return <Outlet />
}

export function GuestOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'user') return <Navigate to="/" replace />
  return <Outlet />
}
