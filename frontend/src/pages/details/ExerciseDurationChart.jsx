import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTick, CHART, tooltipProps } from '../../components/chartTheme.js'
import styles from './Details.module.css'

const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#79706e']
const SCALE = [60, 45, 30, 15, 0]

export default function ExerciseDurationChart({ dates, dailyTotals, taskTitles = [] }) {
  const safeTotals = Array.isArray(dailyTotals) ? dailyTotals : []
  const byDate = Object.fromEntries(safeTotals.map((row) => [row.date, row]))
  const recordedTitles = safeTotals.flatMap((row) => (Array.isArray(row.activities) ? row.activities : []).map((activity) => activity.title))
  const titles = [...new Set([...(Array.isArray(taskTitles) ? taskTitles : []), ...recordedTitles])]
  const activities = titles.map((title, index) => ({ title, key: `activity_${index}`, color: PALETTE[index % PALETTE.length] }))
  const activityKeys = activities.map((activity) => activity.key)
  const rows = dates.map((date) => {
    const row = byDate[date]
    const byTitle = Object.fromEntries((Array.isArray(row?.activities) ? row.activities : []).map((activity) => [activity.title, Number(activity.duration_minutes) || 0]))
    let usedMinutes = 0
    const values = {}
    activities.forEach((activity) => {
      const minutes = Math.max(0, byTitle[activity.title] || 0)
      const visibleMinutes = Math.min(minutes, 60 - usedMinutes)
      usedMinutes += visibleMinutes
      values[activity.key] = visibleMinutes
    })
    return { day: `${Number(date.slice(8, 10))}日`, ...values }
  })

  return (
    <div className={styles.durationChartWrap}>
      <div className={styles.durationRecharts}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: -6, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tick={axisTick} />
            <YAxis domain={[0, 60]} ticks={SCALE} tickLine={false} axisLine={false} tick={axisTick} />
            <Tooltip
              content={<ExerciseTooltip />}
              cursor={false}
              wrapperStyle={{ pointerEvents: 'none' }}
            />
            {activities.map((activity) => (
              <Bar
                key={activity.key}
                dataKey={activity.key}
                name={activity.title}
                stackId="duration"
                fill={activity.color}
                maxBarSize={26}
                isAnimationActive={false}
                shape={(barProps) => <ExerciseBarShape {...barProps} dataKey={activity.key} activityKeys={activityKeys} />}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {activities.length > 0 && (
        <ul className={styles.activityLegend} aria-label="運動項目">
          {activities.map((activity) => (
            <li key={activity.key} className={styles.activityLegendItem}>
              <span className={styles.activitySwatch} style={{ backgroundColor: activity.color }} />
              {activity.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ExerciseTooltip({ active, payload, label }) {
  const recordedActivities = (payload || []).filter((entry) => Number(entry.value) > 0)
  if (!active || recordedActivities.length === 0) return null

  return (
    <div style={{ ...tooltipProps.contentStyle, padding: '6px 8px', borderRadius: 14, fontSize: '0.95rem', lineHeight: 1.2 }}>
      <p style={{ ...tooltipProps.labelStyle, margin: '0 0 4px', lineHeight: 1.4 }}>{label}</p>
      {recordedActivities.map((entry) => (
        <p key={entry.dataKey} style={{ ...tooltipProps.itemStyle, margin: '0 0 4px', padding: 0, lineHeight: 1.4 }}>
          {entry.name}: {entry.value}分
        </p>
      ))}
    </div>
  )
}

function ExerciseBarShape({ x, y, width, height, fill, payload, dataKey, activityKeys }) {
  if (!(height > 0) || !(width > 0)) return null
  const keyIndex = activityKeys.indexOf(dataKey)
  const isTopSegment = activityKeys.slice(keyIndex + 1).every((key) => Number(payload?.[key]) <= 0)
  if (!isTopSegment) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} stroke={CHART.ink} strokeWidth={2} />
  }

  const radius = Math.min(6, width / 2, height)
  const path = `M ${x} ${y + height} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + width - radius} ${y} Q ${x + width} ${y} ${x + width} ${y + radius} L ${x + width} ${y + height} Z`
  return <path d={path} fill={fill} stroke={CHART.ink} strokeWidth={2} />
}

