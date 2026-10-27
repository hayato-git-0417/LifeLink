// 円グラフ（ドーナツ）。ratio（0〜1）の分だけ color で塗り、まん中に children を出す。
// CSS の conic-gradient で描き、外と内側をココアの線でふちどる（Recharts は使わない）
//   <Donut ratio={0.6} color="var(--meal-deep)" size={118}><strong>1560</strong></Donut>
import styles from './Donut.module.css'

export default function Donut({ ratio, color, size = 120, thickness = 18, children }) {
  const percent = Math.max(0, Math.min(Number(ratio) || 0, 1)) * 100
  return (
    <div
      className={styles.donut}
      style={{ width: size, height: size, '--donut-color': color, '--donut-percent': `${percent}%`, '--donut-thickness': `${thickness}px` }}
    >
      <div className={styles.center}>{children}</div>
    </div>
  )
}
