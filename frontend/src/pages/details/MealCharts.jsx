import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTick, CHART, tooltipProps } from '../../components/chartTheme.js'
import { formatNumber, formatDay, formatDate } from '../../lib/format.js'
import { MEAL_SERIES, mealNutritionRows, mealTimeRows, mealTimeLabel } from './mealChartData.js'

const legendStyle = { fontSize: 11, fontWeight: 700 }

export default function MealNutritionChart({ dates, meals, nutrient, goal }) {
  const rows = mealNutritionRows(dates, meals, nutrient.key)
  const types = MEAL_SERIES.filter((type) => type.key !== 'unclassified' || meals.some((meal) => !MEAL_SERIES.some((type) => type.key === meal.meal_type)))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tick={axisTick} />
        <YAxis domain={[0, 'auto']} tickLine={false} axisLine={false} tick={axisTick} width={50} label={{ value: nutrient.unit, position: 'top', fill: CHART.inkSoft, fontSize: 11 }} />
        <Tooltip labelFormatter={formatDate} formatter={(value, name) => [formatNumber(value) + ' ' + nutrient.unit, name]} {...tooltipProps} />
        <Legend iconSize={10} wrapperStyle={legendStyle} />
        {types.map((type) => <Bar key={type.key} stackId="meals" dataKey={type.key} name={type.label} fill={type.color} stroke={CHART.ink} strokeWidth={1} maxBarSize={32} isAnimationActive={false} />)}
        {Number(goal) > 0 && <ReferenceLine y={Number(goal)} stroke={CHART.inkSoft} strokeDasharray="5 4" ifOverflow="extendDomain" label={{ value: '目標 ' + formatNumber(goal) + ' ' + nutrient.unit, position: 'insideTopRight', fill: CHART.inkSoft, fontSize: 10 }} />}
      </BarChart>
    </ResponsiveContainer>
  )
}

function MealTimeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const type = MEAL_SERIES.find((type) => type.key === row.mealType)
  return <div style={tooltipProps.contentStyle}>{formatDate(row.date)}<br />{type?.label || '区分なし'} {mealTimeLabel(row.minutes)}</div>
}

export function MealTimeChart({ dates, meals }) {
  const rows = mealTimeRows(dates, meals)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} />
        <XAxis type="number" dataKey="day" domain={[-0.5, dates.length - 0.5]} ticks={dates.map((_, i) => i)} tickFormatter={(index) => dates[index] ? formatDay(dates[index]) : ''} tickLine={false} tick={axisTick} />
        <YAxis type="number" dataKey="minutes" domain={[0, 1440]} ticks={[0, 360, 720, 1080, 1440]} tickFormatter={mealTimeLabel} reversed tickLine={false} tick={axisTick} width={50} />
        <Tooltip content={<MealTimeTooltip />} />
        <Legend iconSize={10} wrapperStyle={legendStyle} />
        {MEAL_SERIES.slice(0, 4).map((type) => <Scatter key={type.key} name={type.label} data={rows.filter((row) => row.mealType === type.key)} fill={type.color} stroke={CHART.ink} isAnimationActive={false} />)}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
