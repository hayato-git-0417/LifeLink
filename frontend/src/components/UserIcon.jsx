// ユーザーのアイコン（users.icon）。種類と色は userIcons.js
import styles from './UserIcon.module.css'
import { USER_ICONS } from './userIcons.js'

export default function UserIcon({ icon, size = 64 }) {
  const item = USER_ICONS.find((entry) => entry.key === icon) || USER_ICONS[0]
  return (
    <span
      className={styles.icon}
      style={{ width: size, height: size, background: item.background, fontSize: size * 0.55 }}
      role="img"
      aria-label={item.label}
    >
      {item.emoji ?? (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true">
          <circle cx="12" cy="8" r="4.6" fill={item.color} />
          <path fill={item.color} d="M3.5 21.5c0-4.6 3.8-7.6 8.5-7.6s8.5 3 8.5 7.6Z" />
        </svg>
      )}
    </span>
  )
}

// アイコンを1つ選ぶ（新規登録②・プロフィール変更）
export function UserIconPicker({ value, onChange }) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label="アイコン">
      {USER_ICONS.map((item) => (
        <button
          key={item.key}
          type="button"
          role="radio"
          aria-checked={value === item.key}
          className={`${styles.choice} ${value === item.key ? styles.selected : ''}`}
          onClick={() => onChange(item.key)}
        >
          <UserIcon icon={item.key} size={48} />
        </button>
      ))}
    </div>
  )
}
