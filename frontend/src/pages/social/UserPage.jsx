// 他人のマイページ（spec.md 5章【仮】）。公開するのは アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ。
// キャラは小さな部屋に立たせて見せる。相互フォローの人は「記録の詳細を見る」から詳細画面（読み取り専用）を開ける。
// 自分の id ならマイページへ移る
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { ChartIcon } from '../../components/icons.jsx'
import form from '../../styles/form.module.css'
import FollowButton from './FollowButton.jsx'
import ProfileHeader from './ProfileHeader.jsx'
import styles from './Social.module.css'

const MAX_POINTS = 1000

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
                  setUser({
                    ...user,
                    following: data.following,
                    mutual: data.following && user.mutual,
                    followers_count: data.followers_count,
                  })
                  refreshMe().catch(() => {})
                  // フォローし直すと相互になることがあるので取り直す
                  if (data.following) api(`/users/${id}`).then((fresh) => setUser(fresh.user)).catch(() => {})
                }}
                onError={setErrors}
              />
            </ProfileHeader>
            {user.character && (
              <section className={`${form.card} ${styles.characterCard}`}>
                <div className={styles.miniRoom}>
                  <span className={styles.miniRug} aria-hidden="true" />
                  <img src={user.character.image_path} alt="" width="132" height="132" className={styles.characterImage} />
                </div>
                <div className={styles.characterBody}>
                  <h2 className={styles.characterName}>{user.character.name}</h2>
                  <dl className={styles.characterStats}>
                    <div>
                      <dt>状態</dt>
                      <dd>{user.character.state_label}</dd>
                    </div>
                    <div>
                      <dt>気分</dt>
                      <dd>{user.character.mood.label}</dd>
                    </div>
                  </dl>
                  <div className={styles.points}>
                    <span className={styles.pointsLabel}>総合ポイント</span>
                    <strong>
                      {user.character.total_points}
                      <small> / {MAX_POINTS} P</small>
                    </strong>
                    <span className={styles.pointsBar}>
                      {user.character.total_points > 0 && (
                        <span style={{ width: `${Math.min(user.character.total_points / MAX_POINTS, 1) * 100}%` }} />
                      )}
                    </span>
                  </div>
                </div>
              </section>
            )}
            {user.mutual && (
              <Link to={`/users/${user.id}/details`} className={`${form.button} ${form.block}`}>
                <ChartIcon size={20} />
                記録の詳細を見る（相互フォロー）
              </Link>
            )}
            <p className={styles.note}>キャラの状態とポイントは、その人が最後にアプリを開いたときのものです。</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
