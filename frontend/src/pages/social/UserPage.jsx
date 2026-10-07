// 他人のマイページ（spec.md 5章【仮】）。公開するのは アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ。
// 自分の id ならマイページへ移る
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import FollowButton from './FollowButton.jsx'
import ProfileHeader from './ProfileHeader.jsx'
import styles from './Social.module.css'

export default function UserPage() {
  const { id } = useParams()
  const { refreshMe } = useAuth()
  const [user, setUser] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let active = true
    api(`/users/${id}`)
      .then((data) => active && setUser(data.user))
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [id])

  if (user?.is_self) return <Navigate to="/mypage" replace />

  return (
    <AppShell title={user ? user.name : 'ユーザー'} backTo="/follows">
      <div className={styles.page}>
        <ErrorList errors={errors} />
        {!user ? (
          !errors.length && <p className={styles.empty}>読み込み中…</p>
        ) : (
          <>
            <ProfileHeader user={user} followersCount={user.followers_count} followingsCount={user.followings_count}>
              <FollowButton
                userId={user.id}
                following={user.following}
                onChange={(data) => {
                  setUser({ ...user, following: data.following, followers_count: data.followers_count })
                  refreshMe().catch(() => {})
                }}
                onError={setErrors}
              />
            </ProfileHeader>
            {user.character && (
              <section className={`${styles.card} ${styles.character}`}>
                <img src={user.character.image_path} alt="" width="160" height="160" className={styles.characterImage} />
                <div className={styles.characterBody}>
                  <span className={styles.characterName}>{user.character.name}</span>
                  <span>
                    状態: <strong>{user.character.state_label}</strong>
                  </span>
                  <span>
                    気分: <strong>{user.character.mood.label}</strong>
                  </span>
                  <span className={styles.points}>総合 {user.character.total_points} / 1000 P</span>
                </div>
              </section>
            )}
            <p className={styles.note}>※ キャラの状態とポイントは、その人が最後にアプリを開いたときのものです。</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
