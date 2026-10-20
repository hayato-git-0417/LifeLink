// 食事トップ（デザイン p.13）。今日の摂取量（円グラフはカロリー）・PFC・食物繊維、記録する・一覧、今日の食事カード。
// 「!」ボタンは作らない（spec.md 5章）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import { CATEGORY_COLORS, CHART } from '../../components/chartTheme.js'
import Donut from '../../components/Donut.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import { CameraIcon, ListIcon, MealIcon } from '../../components/icons.jsx'
import { formatNumber } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import MealCard from './MealCard.jsx'
import styles from './Meals.module.css'
import { NUTRIENTS, sumNutrients } from './mealTypes.js'

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
  // 目標をこえたら円グラフの色を変える
  const over = calorieGoal > 0 && calories > calorieGoal

  return (
    <AppShell title="食事" backTo="/">
      <ErrorList errors={errors} />
      {!meals ? (
        !errors.length && <p className={form.loading}>読み込み中…</p>
      ) : (
        <div className={styles.page}>
          <section className={form.card}>
            <div className={form.panelHead}>
              <IconBadge tone="meal">
                <MealIcon size={20} />
              </IconBadge>
              <h2>今日の食事</h2>
              <span className={styles.count}>{meals.length}食</span>
            </div>
            <div className={styles.summary}>
              <Donut ratio={calorieGoal > 0 ? calories / calorieGoal : 0} color={over ? CHART.over : CATEGORY_COLORS.meal} size={118}>
                <strong className={styles.donutValue}>{formatNumber(calories)}</strong>
                <span className={styles.donutLabel}>/ {calorieGoal || '-'} kcal</span>
              </Donut>
              <ul className={styles.nutrients}>
                {NUTRIENTS.filter(({ key }) => key !== 'calories').map(({ key, goalKey, label, unit }) => {
                  const target = Number(goal?.[goalKey]) || 0
                  const ratio = target > 0 ? Math.min(totals[key] / target, 1) : 0
                  return (
                    <li key={key} className={styles.nutrient}>
                      <span className={styles.nutrientName}>{label}</span>
                      <span className={styles.nutrientValue}>
                        {formatNumber(totals[key])}
                        <small>
                          {' '}
                          / {formatNumber(goal?.[goalKey])} {unit}
                        </small>
                      </span>
                      <span className={styles.meter}>{ratio > 0 && <span style={{ width: `${ratio * 100}%` }} />}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>

          <div className={styles.mainButtons}>
            <Link to="/meals/new" className={`${form.button} ${form.primary}`}>
              <CameraIcon size={20} />
              記録する
            </Link>
            <Link to="/meals/list" className={form.button}>
              <ListIcon size={20} />
              一覧
            </Link>
          </div>

          <section>
            <h2 className={styles.heading}>今日の記録</h2>
            {meals.length === 0 ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>まだ記録がありません</p>
                <p className={styles.emptyText}>食べたら「記録する」から、写真と内容を残しましょう。</p>
              </div>
            ) : (
              <div className={styles.cards}>
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  )
}
