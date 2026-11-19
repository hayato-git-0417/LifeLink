// 目標設定: 食事の目標（栄養5項目）と食事時刻。新規登録④（デザインなし。③と同じ見た目）・目標設定・目標変更で使う
// basis は GET /goal/nutrition_defaults の basis（初期値を出した年齢・性別）
import FieldError from '../components/FieldError.jsx'
import IconBadge from '../components/IconBadge.jsx'
import { ClockIcon, MealIcon } from '../components/icons.jsx'
import styles from '../styles/form.module.css'
import { MEAL_TIME_FIELDS, NUTRIENT_FIELDS } from './goalDraft.js'
import goal from './GoalForm.module.css'

const GENDER_LABELS = { male: '男性', female: '女性', unspecified: '未回答', other: 'その他' }

export default function MealGoalForm({ value, onChange, basis, onResetDefaults, loadingDefaults, errors = {} }) {
  return (
    <div className={goal.sections}>
      <section className={styles.card}>
        <div className={styles.panelHead}>
          <IconBadge tone="meal">
            <MealIcon size={20} />
          </IconBadge>
          <h2>食事の目標（1日）</h2>
        </div>
        {basis && (
          <p className={`${styles.hint} ${goal.basis}`}>
            {basis.age}歳・{GENDER_LABELS[basis.gender] ?? basis.gender}
            {basis.averaged ? '（男女の平均）' : ''}{basis.activity_label ? '・' + basis.activity_label : ''}の目安です。自由に変えられます。
            <br />
            出典: {basis.source}
          </p>
        )}
        {basis?.explanation && <p className={styles.hint}>{basis.explanation}</p>}
        {basis?.notice && <p className={styles.notice} role="status">{basis.notice}</p>}
        <div className={goal.nutrients}>
          {NUTRIENT_FIELDS.map(({ key, label, unit, step }) => (
            <label key={key} className={goal.nutrient}>
              <span className={goal.nutrientLabel}>{label}</span>
              <span className={goal.withUnit}>
                <input
                  className={`${styles.input} ${goal.nutrientInput}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={step}
                  aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? key + '-error' : undefined}
                  disabled={loadingDefaults}
                  value={value[key]}
                  onChange={(event) => onChange({ [key]: event.target.value })}
                />
                <span className={goal.unit}>{unit}</span>
              </span>
              <FieldError errors={errors} name={key} />
            </label>
          ))}
        </div>
        {onResetDefaults && (
          <button type="button" className={`${styles.linkButton} ${goal.reset}`} onClick={onResetDefaults} disabled={loadingDefaults}>
            {loadingDefaults ? '読み込み中…' : '入力情報から出し直す'}
          </button>
        )}

      </section>

      <section className={styles.card}>
        <div className={styles.panelHead}>
          <IconBadge tone="meal">
            <ClockIcon size={20} />
          </IconBadge>
          <h2>食事の時刻</h2>
        </div>
        <div className={goal.mealTimes}>
          {MEAL_TIME_FIELDS.map(({ key, label }) => (
            <label key={key} className={goal.mealTime}>
              <span className={goal.nutrientLabel}>{label}</span>
              <input
                className={`${styles.input} ${goal.timeInput}`}
                type="time"
                aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? key + '-error' : undefined}
                  value={value[key]}
                onChange={(event) => onChange({ [key]: event.target.value })}
              />
              <FieldError errors={errors} name={key} />
            </label>
          ))}
        </div>
        <p className={`${styles.hint} ${goal.below}`}>1時間たっても記録がないと、キャラがおなかをすかせます。</p>
      </section>
    </div>
  )
}
