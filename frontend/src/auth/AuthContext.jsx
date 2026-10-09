// ログイン状態。起動時に保存済みのトークンで /me を呼び、ログイン中かどうかを決める。
//   status: 'loading'（確認中） / 'guest'（未ログイン） / 'user'（ログイン中）
//   user: GET /me の user（goal_registered が false なら目標設定へ誘導する）
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearAuth, hasAuth, setUnauthorizedHandler } from '../api/client.js'
import { AuthContext } from './useAuth.js'

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState(hasAuth() ? 'loading' : 'guest')
  const [user, setUser] = useState(null)
  // ヘッダーのベルに出す未読数（ホームの API で更新する。フェーズ6）
  const [unreadCount, setUnreadCount] = useState(0)

  const becomeGuest = useCallback(() => {
    clearAuth()
    setUser(null)
    setUnreadCount(0)
    setStatus('guest')
  }, [])

  // 自分の情報を取り直す（目標を保存したあとなど）
  const refreshMe = useCallback(async () => {
    const data = await api('/me')
    setUser(data.user)
    setStatus('user')
    return data.user
  }, [])

  // トークン切れ（401）ならログイン画面へ
  useEffect(() => {
    setUnauthorizedHandler(() => {
      becomeGuest()
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [becomeGuest, navigate])

  useEffect(() => {
    if (!hasAuth()) return
    refreshMe().catch(becomeGuest)
  }, [refreshMe, becomeGuest])

  const login = useCallback(
    async (email, password) => {
      await api('/auth/sign_in', { method: 'POST', body: { email, password } })
      return refreshMe()
    },
    [refreshMe],
  )

  const logout = useCallback(async () => {
    try {
      await api('/auth/sign_out', { method: 'DELETE' })
    } catch {
      // サーバー側で失敗しても、手元のトークンは消してログアウトしたことにする
    }
    becomeGuest()
    navigate('/login', { replace: true })
  }, [becomeGuest, navigate])

  // 新規登録は SignupPage が POST /auth → PUT /goal → refreshMe の順に呼ぶ
  // （先にログイン状態にすると、目標の保存前に目標設定画面へ振り分けられてしまうため）
  const value = useMemo(
    () => ({ status, user, unreadCount, setUnreadCount, login, logout, refreshMe }),
    [status, user, unreadCount, login, logout, refreshMe],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
