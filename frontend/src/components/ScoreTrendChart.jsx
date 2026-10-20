// スコア（棒・左の目盛り 0〜100%）とポイント（線・右の目盛り 0〜1000）の推移。詳細画面で使う。
// Recharts を読み込むので、使う画面は React.lazy で開く。
//   rows: [{ day: '7日', score: 76.5, points: 599 }]（値がない日は null）
//   color: 棒の色（項目の色。chartTheme.js の CATEGORY_COLORS）
//   height: 数値（px）か '100%'（親の高さいっぱい。親に高さが必要）
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTick, CHART, tooltipProps } from './chartTheme.js'

export default function ScoreTrendChart({ rows, color, scoreLabel = 'スコア', pointsLabel = 'ポイント', height = 220 }) {
  // ワークのスコアは 100% を超えることがあるので、そのときは目盛りを広げる
  const maxScore = Math.ceil(Math.max(100, ...rows.map((row) => row.score ?? 0)) / 25) * 25
  const scoreTicks = Array.from({ length: maxScore / 25 + 1 }, (_, i) => i * 25)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: -6, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tick={axisTick} />
        <YAxis yAxisId="score" domain={[0, maxScore]} ticks={scoreTicks} tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis
          yAxisId="points"
          orientation="right"
          domain={[0, 1000]}
          ticks={[0, 250, 500, 750, 1000]}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
        />
        <Tooltip formatter={(value, name) => (name === scoreLabel ? [`${value}%`, name] : [`${value} P`, name])} {...tooltipProps} />
        <Legend
          iconSize={10}
          wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
          formatter={(value) => <span style={{ color: CHART.ink }}>{value}</span>}
        />
        <Bar
          yAxisId="score"
          dataKey="score"
          name={scoreLabel}
          fill={color}
          stroke={CHART.ink}
          strokeWidth={2}
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
          isAnimationActive={false}
        />
        <Line
          yAxisId="points"
          dataKey="points"
          name={pointsLabel}
          stroke={CHART.ink}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: CHART.paper, stroke: CHART.ink, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: CHART.paper, stroke: CHART.ink, strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
