// まだ作っていない画面の仮ページ（フェーズ6・7で置き換える）
import AppShell from '../components/AppShell.jsx'
import styles from './PlaceholderPage.module.css'

export default function PlaceholderPage({ title, phase }) {
  return (
    <AppShell title={title}>
      <div className={styles.box}>
        <p className={styles.title}>{title}</p>
        <p>この画面は準備中です{phase ? `（フェーズ${phase}で作成）` : ''}。</p>
      </div>
    </AppShell>
  )
}
