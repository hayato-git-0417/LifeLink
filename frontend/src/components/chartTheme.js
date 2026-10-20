// グラフ（Recharts）の共通の見た目。Recharts の色には CSS 変数を渡せないので、index.css と同じ値をここに持つ。
// 棒や円はキャラと同じようにココアの線でふちどる
export const CHART = {
  ink: '#4a3a2e',
  inkSoft: '#7b6656',
  grid: '#eadfcc',
  paper: '#fffbf0',
  paperDeep: '#f5ead8',
  over: '#d9644f',
}

// 項目の色（濃いめ）。食事＝黄・ワーク＝緑・運動＝ピンク・睡眠＝青
export const CATEGORY_COLORS = {
  meal: '#ebbb4a',
  work: '#86c069',
  exercise: '#e47f76',
  sleep: '#75a9dc',
}

export const axisTick = { fill: CHART.inkSoft, fontSize: 11, fontWeight: 700 }

export const tooltipProps = {
  contentStyle: {
    background: CHART.paper,
    border: `2px solid ${CHART.ink}`,
    borderRadius: 12,
    padding: '6px 10px',
    fontWeight: 700,
  },
  labelStyle: { color: CHART.ink, marginBottom: 2 },
  itemStyle: { color: CHART.ink, padding: 0 },
  cursor: { fill: 'rgba(74, 58, 46, 0.06)' },
}
