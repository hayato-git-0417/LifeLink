// マイページ（デザイン p.3、spec.md 5章）。アイコン・名前・フォロワー数／フォロー中数（押すとフォロー一覧）・記録グラフ。
// 記録グラフはデザインどおり睡眠の記録: 円グラフ（最新の睡眠の合計睡眠時間。目標の睡眠時間に対する割合）と
// 就寝時間・起床時間、下に直近7日の睡眠時間の棒グラフ（目標は横線）。睡眠の質は出さない（記録しない。2026-10-06 確定）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import { axisTick, CATEGORY_COLORS, CHART, tooltipProps } from '../../components/chartTheme.js'
import Donut from '../../components/Donut.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import { ChevronRightIcon, SleepIcon } from '../../components/icons.jsx'
import { datesBetween, formatDate, formatDay, formatMinutes, formatTime, shiftDate, toDateString } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import ProfileHeader from './ProfileHeader.jsx'
import styles from './Social.module.css'

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
        <section className={form.card}>
          <div className={form.panelHead}>
            <IconBadge tone="sleep">
              <SleepIcon size={20} />
            </IconBadge>
            <h2>睡眠の記録</h2>
            <Link to="/details?tab=sleep" className={styles.more}>
              くわしく
              <ChevronRightIcon size={14} />
            </Link>
          </div>
          {sleep ? <SleepRecord {...sleep} /> : !errors.length && <p className={styles.empty}>読み込み中…</p>}
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
        <Donut ratio={minutes / target} color={CATEGORY_COLORS.sleep} size={124}>
          <strong className={styles.donutValue}>{latest ? formatMinutes(minutes) : '-'}</strong>
          <span className={styles.donutLabel}>合計睡眠時間</span>
        </Donut>
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
      <p className={styles.sleepNote}>
        {latest ? `${formatDate(latest.recorded_on)} に起きた睡眠` : '睡眠の記録はまだありません（ホームの「睡眠」で記録できます）'}
      </p>

      <h3 className={styles.subheading}>睡眠時間（7日）</h3>
      <ResponsiveContainer width="100%" height={132}>
        <BarChart data={bars} margin={{ top: 8, right: 6, bottom: 0, left: -26 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tick={axisTick} />
          <YAxis domain={[0, maxHours]} ticks={ticks} tickLine={false} axisLine={false} tick={axisTick} unit="h" />
          <Tooltip formatter={(value) => [`${value} 時間`, '睡眠時間']} {...tooltipProps} />
          <Bar
            dataKey="hours"
            fill={CATEGORY_COLORS.sleep}
            stroke={CHART.ink}
            strokeWidth={2}
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
          {goalHours && (
            <ReferenceLine
              y={goalHours}
              stroke={CHART.ink}
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{ value: '目標', position: 'insideTopRight', fill: CHART.ink, fontSize: 11, fontWeight: 700 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
