// スコア（棒・左の目盛り 0〜100%）とポイント（線・右の目盛り 0〜1000）の推移。詳細画面とマイページで使う。
// Recharts を読み込むので、使う画面は React.lazy で開く。
//   rows: [{ day: '7日', score: 76.5, points: 599 }]（値がない日は null）
//   height: 数値（px）か '100%'（親の高さいっぱい。親に高さが必要）
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ScoreTrendChart({ rows, scoreLabel = 'スコア', pointsLabel = 'ポイント', height = 220 }) {
  // ワークのスコアは 100% を超えることがあるので、そのときは目盛りを広げる
  const maxScore = Math.ceil(Math.max(100, ...rows.map((row) => row.score ?? 0)) / 25) * 25
  const scoreTicks = Array.from({ length: maxScore / 25 + 1 }, (_, i) => i * 25)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: -8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="#d6e2ea" />
        <XAxis dataKey="day" tickLine={false} fontSize={12} />
        <YAxis yAxisId="score" domain={[0, maxScore]} ticks={scoreTicks} tickLine={false} fontSize={11} />
        <YAxis yAxisId="points" orientation="right" domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} tickLine={false} fontSize={11} />
        <Tooltip
          formatter={(value, name) => (name === scoreLabel ? [`${value}%`, name] : [`${value} P`, name])}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="score" dataKey="score" name={scoreLabel} fill="#5b93c4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Line
          yAxisId="points"
          dataKey="points"
          name={pointsLabel}
          stroke="#f08a24"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
