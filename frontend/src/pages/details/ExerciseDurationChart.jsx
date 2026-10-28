import styles from './Details.module.css'

const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#79706e']
const SCALE = [60, 45, 30, 15, 0]

export default function ExerciseDurationChart({ dates, dailyTotals }) {
  const safeTotals = Array.isArray(dailyTotals) ? dailyTotals : []
  const byDate = Object.fromEntries(safeTotals.map((row) => [row.date, row]))
  const titles = [...new Set(safeTotals.flatMap((row) => (Array.isArray(row.activities) ? row.activities : []).map((activity) => activity.title)))]
  const activities = titles.map((title, index) => ({ title, key: `activity_${index}`, color: PALETTE[index % PALETTE.length] }))
  const rows = dates.map((date) => {
    const row = byDate[date]
    const byTitle = Object.fromEntries((Array.isArray(row?.activities) ? row.activities : []).map((activity) => [activity.title, Number(activity.duration_minutes) || 0]))
    let usedMinutes = 0
    const segments = activities.map((activity) => {
      const minutes = Math.max(0, byTitle[activity.title] || 0)
      const visibleMinutes = Math.min(minutes, 60 - usedMinutes)
      usedMinutes += visibleMinutes
      return { ...activity, minutes, visibleMinutes }
    })
    return { date, day: `${Number(date.slice(8, 10))}日`, segments, total: usedMinutes }
  })

  if (activities.length === 0) return <p className={styles.empty}>この期間の運動時間記録はありません。</p>

  return (
    <div className={styles.durationChartWrap}>
      <div className={styles.durationVerticalPlot}>
        <div className={styles.durationYAxis} aria-hidden="true">
          {SCALE.map((minute) => <span key={minute}>{minute}</span>)}
        </div>
        <div className={styles.durationPlotColumn}>
          <div className={styles.durationPlotArea}>
            {SCALE.map((minute) => (
              <span
                key={minute}
                className={styles.durationGridLine}
                style={{ top: `${(60 - minute) / 60 * 100}%` }}
              />
            ))}
            <div className={styles.durationColumns}>
              {rows.map((row) => (
                <div key={row.date} className={styles.durationColumn}>
                  {row.total > 0 && (
                    <div
                      className={styles.durationStack}
                      style={{ height: `${row.total / 60 * 100}%` }}
                      aria-label={`${row.day} 合計${row.total}分`}
                    >
                    {row.segments.map((segment) => segment.visibleMinutes > 0 && (
                      <span
                        key={segment.key}
                        className={styles.durationSegment}
                        title={`${segment.title}: ${segment.minutes}分`}
                        aria-label={`${segment.title} ${segment.minutes}分`}
                        style={{ flexGrow: segment.visibleMinutes, backgroundColor: segment.color }}
                      />
                    ))}
                  </div>
                  )} 
                </div>
              ))}
            </div>
          </div>
          <div className={styles.durationXAxis}>
            {rows.map((row) => <span key={row.date}>{row.day}</span>)}
          </div>
        </div>
      </div>
      <ul className={styles.activityLegend} aria-label="運動項目">
        {activities.map((activity) => (
          <li key={activity.key} className={styles.activityLegendItem}>
            <span className={styles.activitySwatch} style={{ backgroundColor: activity.color }} />
            {activity.title}
          </li>
        ))}
      </ul>
    </div>
  )
}



// import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
// import { axisTick, CHART, tooltipProps } from '../../components/chartTheme.js'
// import styles from './Details.module.css'

// const PALETTE = ['#e47f76', '#75a9dc', '#86c069', '#ebbb4a', '#a487c7', '#e99b55', '#63b6a1', '#d477a2']

// export default function ExerciseDurationChart({ dates, dailyTotals, height = '100%' }) {
//   const byDate = Object.fromEntries((dailyTotals || []).map((row) => [row.date, row]))
//   const titles = [...new Set((dailyTotals || []).flatMap((row) => (row.activities || []).map((activity) => activity.title)))]
//   const activities = titles.map((title, index) => ({ title, key: `activity_${index}`, color: PALETTE[index % PALETTE.length] }))
//   const titleByKey = Object.fromEntries(activities.map((activity) => [activity.key, activity.title]))
//   const rows = dates.map((date) => {
//     const row = byDate[date]
//     const values = Object.fromEntries(activities.map((activity) => [activity.key, 0]))
//     for (const activity of row?.activities || []) {
//       const entry = activities.find((candidate) => candidate.title === activity.title)
//       if (entry) values[entry.key] = activity.duration_minutes
//     }
//     return { day: date.slice(8, 10).replace(/^0/, '') + '日', ...values }
//   })

//   if (activities.length === 0) return <p className={styles.empty}>この期間の運動時間記録はありません。</p>

//   return (
//     <div className={styles.durationChartWrap}>
//       <div className={styles.durationPlot}>
//         <ResponsiveContainer width="100%" height={height}>
//           <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
//             <CartesianGrid horizontal={false} stroke={CHART.grid} />
//             <XAxis
//               type="number"
//               domain={[0, 60]}
//               ticks={[0, 15, 30, 45, 60]}
//               tickLine={false}
//               axisLine={{ stroke: CHART.ink, strokeWidth: 2 }}
//               tick={axisTick}
//               unit="分"
//             />
//             <YAxis type="category" dataKey="day" width={38} tickLine={false} axisLine={false} tick={axisTick} />
//             <Tooltip formatter={(value, key) => [`${value}分`, titleByKey[key] || key]} {...tooltipProps} />
//             {activities.map((activity) => (
//               <Bar
//                 key={activity.key}
//                 dataKey={activity.key}
//                 name={activity.title}
//                 stackId="duration"
//                 fill={activity.color}
//                 stroke={CHART.ink}
//                 strokeWidth={1.5}
//                 isAnimationActive={false}
//               />
//             ))}
//             </BarChart>
//         </ResponsiveContainer>
//       </div>
//       <ul className={styles.activityLegend} aria-label="運動項目">
//         {activities.map((activity) => (
//           <li key={activity.key} className={styles.activityLegendItem}>
//             <span className={styles.activitySwatch} style={{ backgroundColor: activity.color }} />
//             {activity.title}
//           </li>
//         ))}
//       </ul>
//     </div>
//   )
// }