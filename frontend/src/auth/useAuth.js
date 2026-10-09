// ログイン状態を使う: const { status, user, login, logout } = useAuth()
import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth は AuthProvider の中で使う')
  return context
}
