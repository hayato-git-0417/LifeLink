// 見出しなどの印: 角の丸い四角にアイコンを入れる。tone は項目の色（meal / work / exercise / sleep）か leaf / paper
//   <IconBadge tone="sleep"><SleepIcon size={20} /></IconBadge>
import styles from './IconBadge.module.css'

export default function IconBadge({ tone = 'paper', size = 34, children }) {
  return (
    <span className={`${styles.badge} ${styles[tone] || ''}`} style={{ width: size, height: size }} aria-hidden="true">
      {children}
    </span>
  )
}
