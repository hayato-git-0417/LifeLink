// ユーザーのアイコン（users.icon）。種類と色は userIcons.js。キャラと同じ線画（ココアの線・ほっぺ）で描く
import { useId } from 'react'
import { CheckIcon } from './icons.jsx'
import styles from './UserIcon.module.css'
import { USER_ICONS } from './userIcons.js'

const INK = '#4a3a2e'
const PAPER = '#fffbf0'
const CHEEK = '#f6b9b0'

export default function UserIcon({ icon, size = 64 }) {
  const item = USER_ICONS.find((entry) => entry.key === icon) || USER_ICONS[0]
  // 丸の外にはみ出す部分を切り取る（id は画面の中で重ならないようにする）
  const clipId = `avatar${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg className={styles.icon} viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={item.label}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={item.background} />
      <g clipPath={`url(#${clipId})`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {item.kind === 'cat' ? <Cat /> : item.kind === 'penguin' ? <Penguin /> : <Person color={item.color} />}
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke={INK} strokeWidth="2.5" />
    </svg>
  )
}

// 目・ほっぺ・口（x, y は両目のまん中）
function Face({ x = 32, y, gap = 4.4 }) {
  return (
    <>
      <circle cx={x - gap} cy={y} r="1.8" fill={INK} stroke="none" />
      <circle cx={x + gap} cy={y} r="1.8" fill={INK} stroke="none" />
      <ellipse cx={x - gap - 3.2} cy={y + 3.8} rx="2.5" ry="1.6" fill={CHEEK} stroke="none" />
      <ellipse cx={x + gap + 3.2} cy={y + 3.8} rx="2.5" ry="1.6" fill={CHEEK} stroke="none" />
    </>
  )
}

function Person({ color }) {
  return (
    <>
      <path d="M10.5 64c0-12.6 9.6-20.4 21.5-20.4S53.5 51.4 53.5 64Z" fill={color} />
      <circle cx="32" cy="28" r="12.2" fill={PAPER} />
      <Face y={28} />
      <path d="M30.2 31.6q1.8 1.6 3.6 0" fill="none" strokeWidth="1.6" />
    </>
  )
}

function Cat() {
  const fur = '#f5c27e'
  return (
    <>
      <path d="M12 64c0-8.2 8.8-13.4 20-13.4S52 55.8 52 64Z" fill={fur} />
      <path
        d="M14.5 34c0-5 1.4-9 3.6-12l.4-10.4 9.2 6.6c1.4-.3 2.8-.5 4.3-.5s2.9.2 4.3.5l9.2-6.6.4 10.4c2.2 3 3.6 7 3.6 12 0 9.6-7.8 15.6-17.5 15.6S14.5 43.6 14.5 34Z"
        fill={fur}
      />
      <Face y={33.5} gap={5.2} />
      <path d="M30.4 36.6h3.2L32 38.4Z" fill="#e07a73" strokeWidth="1.4" />
      <path d="M29.2 39.6q1.4 1.3 2.8 0q1.4 1.3 2.8 0" fill="none" strokeWidth="1.5" />
      <path d="M11.5 35.5l7.2.9M11.5 40.2l7.2-1M52.5 35.5l-7.2.9M52.5 40.2l-7.2-1" fill="none" strokeWidth="1.4" />
    </>
  )
}

function Penguin() {
  return (
    <>
      <path
        d="M11.5 64c0-15.6 4.6-25.4 9.6-28.6-.9-1.8-1.4-3.8-1.4-5.9 0-7 5.4-12.3 12.3-12.3s12.3 5.3 12.3 12.3c0 2.1-.5 4.1-1.4 5.9 5 3.2 9.6 13 9.6 28.6Z"
        fill="#5a6684"
      />
      <path d="M22 31.2c0-4.7 4.3-7.7 10-7.7s10 3 10 7.7-4.3 7.6-10 7.6-10-2.9-10-7.6Z" fill={PAPER} />
      <path d="M20.5 64c0-10.6 5-19.4 11.5-19.4S43.5 53.4 43.5 64Z" fill={PAPER} />
      <Face y={30.6} gap={4.6} />
      <path d="M29.4 33.8h5.2L32 36.8Z" fill="#f2b14a" strokeWidth="1.6" />
    </>
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
          {value === item.key && (
            <span className={styles.check}>
              <CheckIcon size={12} strokeWidth={3.6} />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
