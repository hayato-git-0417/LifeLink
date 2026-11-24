// ユーザーの一覧（フォロー一覧・検索結果）。名前を押すとその人のマイページ、右にフォローする／外すボタン
import { Link } from 'react-router-dom'
import UserIcon from '../../components/UserIcon.jsx'
import FollowButton from './FollowButton.jsx'
import styles from './Social.module.css'

export default function UserList({ users, emptyText, onFollowChange, onError }) {
  if (users.length === 0) return <p className={styles.empty}>{emptyText}</p>
  return (
    <ul className={styles.userList}>
      {users.map((user) => (
        <li key={user.id} className={styles.userRow}>
          <Link to={`/users/${user.id}`} className={styles.userLink}>
            <UserIcon icon={user.icon} avatarUrl={user.avatar_selected ? user.avatar_url : null} size={48}/>
            <span className={styles.userIdentity}>
              <span className={styles.userName}>{user.name}</span>
              {user.account_id && (
                <span className={styles.userAccountId}>@{user.account_id}</span>
              )}
            </span>
          </Link>
          <FollowButton
            userId={user.id}
            following={user.following}
            onChange={(data) => onFollowChange(user, data)}
            onError={onError}
          />
        </li>
      ))}
    </ul>
  )
}
