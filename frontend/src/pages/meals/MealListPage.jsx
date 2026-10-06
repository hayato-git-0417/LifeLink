// 食事の一覧（食事トップの「一覧」）。1日ずつ表示し、前の日・次の日へ移れる
import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { toDateString } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import MealCard from './MealCard.jsx'
import styles from './Meals.module.css'
import { sumNutrients } from './mealTypes.js'

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

export default function MealListPage() {
  const today = toDateString()
  const [date, setDate] = useState(today)
  const [meals, setMeals] = useState(null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let active = true
    api('/meals', { params: { date } })
      .then((data) => active && setMeals(data.meals))
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [date])

  const changeDate = (value) => {
    setMeals(null)
    setErrors([])
    setDate(value)
  }

  return (
    <AppShell title="食事の一覧" backTo="/meals">
      <div className={styles.dateNav}>
        <button type="button" className={styles.dateButton} onClick={() => changeDate(shiftDate(date, -1))} aria-label="前の日">
          ◀
        </button>
        <input
          className={`${form.input} ${styles.dateInput}`}
          type="date"
          max={today}
          value={date}
          onChange={(event) => event.target.value && changeDate(event.target.value)}
        />
        <button
          type="button"
          className={styles.dateButton}
          onClick={() => changeDate(shiftDate(date, 1))}
          disabled={date >= today}
          aria-label="次の日"
        >
          ▶
        </button>
      </div>
      <ErrorList errors={errors} />
      {meals &&
        (meals.length === 0 ? (
          <p className={styles.empty}>この日の食事の記録はありません。</p>
        ) : (
          <>
            <p className={styles.dayTotal}>合計 {sumNutrients(meals).calories} kcal</p>
            <div className={styles.list}>
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </>
        ))}
    </AppShell>
  )
}
