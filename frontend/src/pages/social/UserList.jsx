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
            <UserIcon icon={user.icon} size={52} />
            <span className={styles.userName}>{user.name}</span>
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
