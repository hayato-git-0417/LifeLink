// マイページ（デザイン p.3）。アイコン・名前・フォロワー数／フォロー中数（押すとフォロー一覧）・記録グラフ。
// グラフは直近7日の「総合達成度（棒）」と「総合ポイント（線）」。項目ごとのグラフは詳細画面で見る
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import ScoreTrendChart from '../../components/ScoreTrendChart.jsx'
import { datesBetween, formatDay, shiftDate, toDateString } from '../../lib/format.js'
import ProfileHeader from './ProfileHeader.jsx'
import styles from './Social.module.css'

export default function MyPage() {
  const { user, refreshMe } = useAuth()
  const [achievements, setAchievements] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let active = true
    // フォロー数を最新にしてからグラフを読む（トークンが入れ替わるので順に呼ぶ）
    refreshMe()
      .then(() => api('/daily_achievements'))
      .then((data) => active && setAchievements(data))
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [refreshMe])

  const today = toDateString()
  const rows = achievements ? totalRows(achievements, datesBetween(shiftDate(today, -6), today), today) : []

  return (
    <AppShell title="マイページ">
      <div className={styles.page}>
        <ProfileHeader
          user={user}
          followersCount={user.followers_count ?? 0}
          followingsCount={user.followings_count ?? 0}
          linkCounts
        />
        <ErrorList errors={errors} />
        <section className={styles.card}>
          <h2 className={styles.heading}>
            総合の記録（7日）
            {achievements && <span className={styles.points}>{achievements.current_points.total} / 1000 P</span>}
          </h2>
          {achievements ? (
            <ScoreTrendChart rows={rows} scoreLabel="総合達成度" pointsLabel="総合ポイント" />
          ) : (
            !errors.length && <p className={styles.empty}>読み込み中…</p>
          )}
          <Link to="/details" className={styles.more}>
            睡眠・食事・運動・ワークの記録を見る ›
          </Link>
        </section>
      </div>
    </AppShell>
  )
}

function totalRows(achievements, dates, today) {
  const byDate = Object.fromEntries(achievements.daily_achievements.map((row) => [row.target_date, row]))
  return dates.map((date) => {
    const row = byDate[date]
    let points = row?.total_points ?? null
    if (date === today && points == null) points = achievements.current_points.total
    return { day: formatDay(date), score: row ? row.total_percent : null, points }
  })
}
