// 食事トップ（デザイン p.13）。今日の摂取量（円グラフはカロリー）・PFC・食物繊維、記録する・一覧、今日の食事カード。
// 「!」ボタンは作らない（spec.md 5章）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { formatNumber } from '../../lib/format.js'
import MealCard from './MealCard.jsx'
import styles from './Meals.module.css'
import { NUTRIENTS, sumNutrients } from './mealTypes.js'

const COLORS = { done: '#4a86e8', over: '#e8834a', rest: '#d6e2ea' }

export default function MealsPage() {
  const [meals, setMeals] = useState(null)
  const [goal, setGoal] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    Promise.all([api('/meals'), api('/goal')])
      .then(([mealData, goalData]) => {
        setMeals(mealData.meals)
        setGoal(goalData.goal)
      })
      .catch((error) => setErrors(error.messages))
  }, [])

  const totals = meals ? sumNutrients(meals) : null
  const calorieGoal = goal?.calorie_goal || 0
  const calories = totals?.calories || 0
  const over = calorieGoal > 0 && calories > calorieGoal
  const chart = [
    { name: 'done', value: Math.min(calories, calorieGoal || calories) },
    { name: 'rest', value: Math.max(calorieGoal - calories, 0) },
  ]
  // 何も食べていないときは灰色の輪だけ
  if (chart.every((part) => part.value === 0)) chart[1].value = 1

  return (
    <AppShell title="食事" backTo="/">
      <ErrorList errors={errors} />
      {!meals ? (
        !errors.length && <p className={styles.loading}>読み込み中…</p>
      ) : (
        <div className={styles.page}>
          <h2 className={styles.heading}>今日の食事</h2>
          <section className={styles.summary}>
            <div className={styles.donut}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chart}
                    dataKey="value"
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chart.map((part) => (
                      <Cell key={part.name} fill={part.name === 'done' ? (over ? COLORS.over : COLORS.done) : COLORS.rest} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutCenter}>
                <strong>{calories}</strong>
                <span>/ {calorieGoal || '-'} kcal</span>
              </div>
            </div>
            <table className={styles.nutrients}>
              <tbody>
                {NUTRIENTS.filter(({ key }) => key !== 'calories').map(({ key, goalKey, label, unit }) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td>
                      {formatNumber(totals[key])} / {formatNumber(goal?.[goalKey])} {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className={styles.mainButtons}>
            <Link to="/meals/new" className={styles.bigButton}>
              📷 記録する
            </Link>
            <Link to="/meals/list" className={styles.bigButton}>
              一覧
            </Link>
          </div>

          {meals.length === 0 ? (
            <p className={styles.empty}>今日の食事はまだ記録されていません。</p>
          ) : (
            <div className={styles.cards}>
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
