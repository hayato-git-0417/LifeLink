// フォローする／外すボタン。押したら API を呼び、結果（following と相手のフォロワー数）を onChange で返す
import { useState } from 'react'
import { api } from '../../api/client.js'
import styles from './Social.module.css'

export default function FollowButton({ userId, following, onChange, onError }) {
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      const data = await api(`/users/${userId}/follow`, { method: following ? 'DELETE' : 'POST' })
      onChange(data)
    } catch (error) {
      onError?.(error.messages)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`${styles.followButton} ${following ? styles.following : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
    >
      {following ? 'フォロー中' : 'フォローする'}
    </button>
  )
}
