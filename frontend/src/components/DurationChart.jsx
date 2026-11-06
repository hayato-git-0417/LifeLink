// 日ごとの時間（睡眠・ワーク）の棒グラフ。詳細画面の「時間」で使う。
// ぱっと見で「何日に何時間か」が分かるように、棒の上に時間を日本語で出す（7時間30分・15分）。
// 棒が細いので「7時間30分」は「7時間」「30分」の2段にする。数字を棒に出すので縦の目盛りは出さない。
// Recharts を読み込むので、使う画面は React.lazy で開く。
//   rows: [{ date: '2026-10-15', minutes: 450 }]（記録のない日は minutes: null）
//   color: 項目の色（chartTheme.js の CATEGORY_COLORS）
//   label: ツールチップの項目名（「睡眠時間」など）
//   height: 数値（px）か '100%'（親の高さいっぱい。親に高さが必要）
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate, formatMinutes } from '../lib/format.js'
import { CHART, tooltipProps } from './chartTheme.js'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function DurationChart({ rows, color, label, height = 220 }) {
  const data = rows.map((row) => ({
    date: row.date,
    minutes: row.minutes,
    hours: row.minutes == null ? null : row.minutes / 60,
  }))
  // 一番長い棒の上にも2段の数字が入るよう、上に余白（margin.top）をとる
  const maxHours = Math.max(1, ...data.map((row) => row.hours ?? 0))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 32, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: CHART.ink, strokeWidth: 2 }}
            tick={<DayTick />}
            height={34}
            interval={0}
          />
          <YAxis hide domain={[0, maxHours]} />
          <Tooltip
            labelFormatter={(date) => formatDate(date)}
            formatter={(_value, _name, item) => [
              item.payload.minutes == null ? '記録なし' : formatMinutes(item.payload.minutes),
              label,
            ]}
            {...tooltipProps}
          />
          <Bar
            dataKey="hours"
            name={label}
            fill={color}
            stroke={CHART.ink}
            strokeWidth={2}
            radius={[6, 6, 0, 0]}
            maxBarSize={30}
            isAnimationActive={false}
          >
            <LabelList dataKey="minutes" content={<DurationLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 棒の上の時間。「7時間30分」は2段、「7時間」「15分」は1段。記録のない日は「-」を軸の上に出す
function DurationLabel({ x, y, width, height, value }) {
  if (x == null || width == null) return null
  const center = x + width / 2
  if (value == null) {
    // 記録のない日は棒がないので、y は軸の位置（y + height）になる
    return (
      <text x={center} y={y + (height ?? 0) - 6} textAnchor="middle" fill={CHART.inkSoft} fontSize={11} fontWeight={800}>
        -
      </text>
    )
  }
  const total = Math.max(0, Math.round(value))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  const lines = hours === 0 ? [`${rest}分`] : rest === 0 ? [`${hours}時間`] : [`${hours}時間`, `${rest}分`]
  return (
    <text x={center} y={y - 6 - (lines.length - 1) * 13} textAnchor="middle" fill={CHART.ink} fontSize={11} fontWeight={800}>
      {lines.map((line, i) => (
        <tspan key={line} x={center} dy={i === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

// 目盛り: 上に日（15日）、下に曜日（土日は色を変える）
function DayTick({ x, y, payload }) {
  if (!payload?.value) return null
  const date = new Date(`${payload.value}T00:00:00`)
  const weekday = date.getDay()
  const weekdayColor = weekday === 0 ? CHART.over : weekday === 6 ? '#4f86c6' : CHART.inkSoft
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={11} fontWeight={700}>
        <tspan x={0} dy={13} fill={CHART.ink}>
          {date.getDate()}日
        </tspan>
        <tspan x={0} dy={13} fill={weekdayColor} fontSize={10}>
          {WEEKDAYS[weekday]}
        </tspan>
      </text>
    </g>
  )
}