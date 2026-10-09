// マイページ（デザイン p.3、spec.md 5章）。アイコン・名前・フォロワー数／フォロー中数（押すとフォロー一覧）・記録グラフ。
// 記録グラフはデザインどおり睡眠の記録: 円グラフ（最新の睡眠の合計睡眠時間。目標の睡眠時間に対する割合）と
// 就寝時間・起床時間、下に直近7日の睡眠時間の棒グラフ（目標は横線）。睡眠の質は出さない（記録しない。2026-10-06 確定）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { datesBetween, formatDate, formatDay, formatMinutes, formatTime, shiftDate, toDateString } from '../../lib/format.js'
import ProfileHeader from './ProfileHeader.jsx'
import styles from './Social.module.css'

const COLORS = { sleep: '#4a86e8', rest: '#d6e2ea', goal: '#f08a24' }

export default function MyPage() {
  const { user, refreshMe } = useAuth()
  const [sleep, setSleep] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let active = true
    // フォロー数を最新にしてから目標と睡眠の記録を読む（トークンが入れ替わるので順に呼ぶ）
    refreshMe()
      .then(() => api('/goal'))
      .then(async ({ goal }) => {
        const { sleep_records: records } = await api('/sleep_records')
        if (active) setSleep({ targetMinutes: goal?.target_sleep_minutes ?? null, records })
      })
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [refreshMe])

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
          {sleep ? <SleepRecord {...sleep} /> : !errors.length && <p className={styles.empty}>読み込み中…</p>}
          <Link to="/details?tab=sleep" className={styles.more}>
            記録をくわしく見る ›
          </Link>
        </section>
      </div>
    </AppShell>
  )
}

// 記録グラフ（睡眠）。records は GET /sleep_records（直近7日・新しい順・計測中も含む）
function SleepRecord({ targetMinutes, records }) {
  const finished = records.filter((record) => !record.in_progress)
  const latest = finished[0]
  const minutes = latest?.duration_minutes ?? 0
  // 目標がない（まだ登録していない）ときは、睡眠時間ぶんだけ塗る
  const target = targetMinutes || minutes || 1
  const done = Math.min(minutes, target)
  const donut = [
    { name: 'sleep', value: done },
    { name: 'rest', value: target - done },
  ]

  const today = toDateString()
  const dates = datesBetween(shiftDate(today, -6), today)
  const minutesByDate = {}
  finished.forEach((record) => {
    minutesByDate[record.recorded_on] = (minutesByDate[record.recorded_on] ?? 0) + record.duration_minutes
  })
  const bars = dates.map((date) => ({
    day: formatDay(date),
    // 記録のない日は 0（すべて空だと目盛りと目標の線が描かれないため）
    hours: Math.round(((minutesByDate[date] ?? 0) / 60) * 10) / 10,
  }))
  const goalHours = targetMinutes ? Math.round((targetMinutes / 60) * 10) / 10 : null
  // 目盛りは 0〜8時間（目標や記録が長ければ広げる）。記録がない週でも目盛りを出すため ticks を決めておく
  const top = Math.max(goalHours ?? 0, 8, ...bars.map((bar) => bar.hours))
  const step = top <= 8 ? 2 : top <= 12 ? 3 : 4
  const maxHours = Math.ceil(top / step) * step
  const ticks = Array.from({ length: maxHours / step + 1 }, (_, i) => i * step)

  return (
    <>
      <div className={styles.sleepTop}>
        <div className={styles.sleepDonut}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                innerRadius="74%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {donut.map((part) => (
                  <Cell key={part.name} fill={COLORS[part.name]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.sleepDonutCenter}>
            <strong>{latest ? formatMinutes(minutes) : '-'}</strong>
            <span>合計睡眠時間</span>
          </div>
        </div>
        <dl className={styles.sleepTimes}>
          <div>
            <dt>就寝時間</dt>
            <dd>{latest ? formatTime(latest.slept_at) : '-'}</dd>
          </div>
          <div>
            <dt>起床時間</dt>
            <dd>{latest ? formatTime(latest.woke_at) : '-'}</dd>
          </div>
          <div>
            <dt>目標</dt>
            <dd>{targetMinutes ? formatMinutes(targetMinutes) : '-'}</dd>
          </div>
        </dl>
      </div>
      <p className={styles.note}>
        {latest ? `${formatDate(latest.recorded_on)} に起きた睡眠` : '睡眠の記録はまだありません（ホームの「就寝」で記録できます）'}
      </p>

      <h2 className={styles.heading}>睡眠時間（7日）</h2>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="#d6e2ea" />
          <XAxis dataKey="day" tickLine={false} fontSize={12} />
          <YAxis domain={[0, maxHours]} ticks={ticks} tickLine={false} fontSize={11} unit="h" />
          <Tooltip formatter={(value) => [`${value} 時間`, '睡眠時間']} />
          <Bar dataKey="hours" fill={COLORS.sleep} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {goalHours && (
            <ReferenceLine
              y={goalHours}
              stroke={COLORS.goal}
              strokeDasharray="5 3"
              label={{ value: '目標', position: 'insideTopRight', fill: COLORS.goal, fontSize: 11 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
