// 通知（spec.md 5章・7章）。新しい順の一覧（50件まで）、未読は強調。開いたらまとめて既読にする【仮】。
// 強調は開いた時点で未読だったもの（既読にしたあとも、この画面にいる間は強調したまま）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import UserIcon from '../../components/UserIcon.jsx'
import { formatDate, formatTime } from '../../lib/format.js'
import styles from './NotificationsPage.module.css'

const TYPE_MARKS = { follow: '👤', character: '🐣', reminder: '🌙', task: '🏃' }

export default function NotificationsPage() {
  const { setUnreadCount } = useAuth()
  const [notifications, setNotifications] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let active = true
    api('/notifications')
      .then(async (data) => {
        if (!active) return
        setNotifications(data.notifications)
        if (data.unread_count > 0) await api('/notifications/read_all', { method: 'POST' })
        if (active) setUnreadCount(0)
      })
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [setUnreadCount])

  return (
    <AppShell title="通知" backTo="/">
      <ErrorList errors={errors} />
      {!notifications ? (
        !errors.length && <p className={styles.empty}>読み込み中…</p>
      ) : notifications.length === 0 ? (
        <p className={styles.empty}>通知はありません。</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => (
            <li key={notification.id} className={`${styles.item} ${notification.read ? '' : styles.unread}`}>
              <span className={styles.mark} aria-hidden="true">
                {notification.actor ? <UserIcon icon={notification.actor.icon} size={40} /> : TYPE_MARKS[notification.notification_type]}
              </span>
              <div className={styles.body}>
                <span className={styles.title}>
                  {!notification.read && <span className={styles.newBadge}>未読</span>}
                  {notification.title}
                </span>
                {notification.body && <span className={styles.text}>{notification.body}</span>}
                <span className={styles.meta}>
                  {formatDate(notification.created_at)} {formatTime(notification.created_at)}
                  {notification.actor && (
                    <Link to={`/users/${notification.actor.id}`} className={styles.actorLink}>
                      {notification.actor.name}さんのページ ›
                    </Link>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
