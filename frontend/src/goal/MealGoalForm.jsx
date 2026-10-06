// 目標設定: 食事の目標（栄養5項目）と食事時刻。新規登録④（デザインなし。③と同じ見た目）・目標設定・目標変更で使う
// basis は GET /goal/nutrition_defaults の basis（初期値を出した年齢・性別）
import styles from '../styles/form.module.css'
import { MEAL_TIME_FIELDS, NUTRIENT_FIELDS } from './goalDraft.js'
import goal from './GoalForm.module.css'

const GENDER_LABELS = { male: '男性', female: '女性', unspecified: '未回答', other: 'その他' }

export default function MealGoalForm({ value, onChange, basis, onResetDefaults, loadingDefaults }) {
  return (
    <div className={styles.form}>
      <section className={goal.section}>
        <h3 className={styles.sectionTitle}>食事の目標（1日）</h3>
        {basis && (
          <p className={styles.hint}>
            {basis.age}歳・{GENDER_LABELS[basis.gender] ?? basis.gender}
            {basis.averaged ? '（男女の平均）' : ''}の基準値です。自由に変えられます。
            <br />
            出典: {basis.source}
          </p>
        )}
        <div className={goal.nutrients}>
          {NUTRIENT_FIELDS.map(({ key, label, unit, step }) => (
            <label key={key} className={goal.nutrient}>
              <span className={goal.nutrientLabel}>{label}</span>
              <input
                className={`${styles.input} ${goal.nutrientInput}`}
                type="number"
                inputMode="decimal"
                min="0"
                step={step}
                value={value[key]}
                onChange={(event) => onChange({ [key]: event.target.value })}
              />
              <span className={goal.unit}>{unit}</span>
            </label>
          ))}
        </div>
        {onResetDefaults && (
          <button type="button" className={styles.linkButton} onClick={onResetDefaults} disabled={loadingDefaults}>
            {loadingDefaults ? '読み込み中…' : '年齢・性別から出し直す'}
          </button>
        )}
      </section>

      <section className={goal.section}>
        <h3 className={styles.sectionTitle}>食事の時刻</h3>
        <p className={styles.hint}>この時刻から1時間たっても記録がないと、キャラがおなかをすかせます。</p>
        {MEAL_TIME_FIELDS.map(({ key, label }) => (
          <label key={key} className={goal.mealTime}>
            <span className={goal.nutrientLabel}>{label}</span>
            <input
              className={`${styles.input} ${styles.time}`}
              type="time"
              value={value[key]}
              onChange={(event) => onChange({ [key]: event.target.value })}
            />
          </label>
        ))}
      </section>
    </div>
  )
}
