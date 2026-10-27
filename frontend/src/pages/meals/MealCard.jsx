// 食事のカード（食事トップ・一覧。どちらも1日分なので時刻だけ出す）。押すと修正画面へ
import { Link } from 'react-router-dom'
import { MealIcon } from '../../components/icons.jsx'
import { formatTime } from '../../lib/format.js'
import styles from './Meals.module.css'
import { mealTypeLabel } from './mealTypes.js'

export default function MealCard({ meal }) {
  return (
    <Link to={`/meals/${meal.id}/edit`} className={styles.card}>
      {meal.photo_url ? (
        <img className={styles.cardPhoto} src={meal.photo_url} alt="" />
      ) : (
        <span className={styles.cardNoPhoto} aria-hidden="true">
          <MealIcon size={26} />
        </span>
      )}
      <span className={styles.cardBody}>
        <span className={styles.cardTop}>
          <span className={styles.cardType}>{mealTypeLabel(meal.meal_type)}</span>
          <span className={styles.cardTime}>{formatTime(meal.eaten_at)}</span>
        </span>
        {meal.content && <span className={styles.cardContent}>{meal.content}</span>}
        <span className={styles.cardKcal}>
          {meal.calories ?? '-'}
          <small> kcal</small>
        </span>
      </span>
    </Link>
  )
}
