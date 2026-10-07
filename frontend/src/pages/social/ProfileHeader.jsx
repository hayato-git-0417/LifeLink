// マイページ・他人のマイページの上部: アイコン・名前・フォロワー数／フォロー中数（デザイン p.3）。
// linkCounts のとき数を押すとフォロー一覧へ（自分のページだけ）
import { Link } from 'react-router-dom'
import UserIcon from '../../components/UserIcon.jsx'
import styles from './Social.module.css'

export default function ProfileHeader({ user, followersCount, followingsCount, linkCounts = false, children }) {
  const counts = [
    { tab: 'followers', label: 'フォロワー', value: followersCount },
    { tab: 'followings', label: 'フォロー中', value: followingsCount },
  ]
  return (
    <section className={styles.profile}>
      <UserIcon icon={user.icon} size={96} />
      <div className={styles.profileBody}>
        <h2 className={styles.profileName}>{user.name}</h2>
        <div className={styles.counts}>
          {counts.map((count) =>
            linkCounts ? (
              <Link key={count.tab} to={`/follows?tab=${count.tab}`} className={styles.count}>
                <strong>{count.value}</strong>
                <span>{count.label}</span>
              </Link>
            ) : (
              <span key={count.tab} className={styles.count}>
                <strong>{count.value}</strong>
                <span>{count.label}</span>
              </span>
            ),
          )}
        </div>
        {children}
      </div>
    </section>
  )
}
