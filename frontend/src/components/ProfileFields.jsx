// プロフィールの入力欄（アイコン・ユーザー名・生年月日・性別）。新規登録②とプロフィール変更（p.16）で使う
//   value: { icon, name, birthdate, gender } / onChange(changes)
import { ACTIVITY_LEVELS } from './activityLevels.js'
import FieldError from './FieldError.jsx'
import BirthdateFields from './BirthdateFields.jsx'
import form from '../styles/form.module.css'
import styles from './ProfileFields.module.css'
import { UserIconPicker } from './UserIcon.jsx'

const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
]

export default function ProfileFields({ value, onChange, errors = {} }) {
  return (
    <>
      <section className={form.card}>
        <h2 className={form.cardTitle}>アイコン</h2>
        <FieldError errors={errors} name="icon" />
        <UserIconPicker value={value.icon} onChange={(icon) => onChange({ icon })} />
      </section>
      <section className={`${form.card} ${form.form}`}>
        <label className={form.field}>
          <span className={form.label}>ユーザー名</span>
          <input
            className={form.input}
            type="text"
            maxLength={50}
            placeholder="名前を入力"
            autoComplete="nickname"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          <FieldError errors={errors} name="name" />
        </label>
        <BirthdateFields value={value.birthdate} onChange={(birthdate) => onChange({ birthdate })} errors={errors} />

        <div className={styles.bodyMeasurements}>
          <label className={form.field}>
            <span className={form.label}>身長（cm）</span>
            <input
              className={form.input}
              type="number"
              step="0.1"
              min="0.1"
              max="999.9"
              required
              aria-invalid={Boolean(errors.height_cm)}
              aria-describedby={errors.height_cm ? 'height_cm-error' : undefined}
              value={value.height_cm ?? ''}
              onChange={(event) => onChange({ height_cm: event.target.value })}
            />
            <FieldError errors={errors} name="height_cm" />
          </label>

          <label className={form.field}>
            <span className={form.label}>体重（kg）</span>
            <input
              className={form.input}
              type="number"
              step="0.1"
              min="0.1"
              max="999.9"
              required
              aria-invalid={Boolean(errors.weight_kg)}
              aria-describedby={errors.weight_kg ? 'weight_kg-error' : undefined}
              value={value.weight_kg ?? ''}
              onChange={(event) => onChange({ weight_kg: event.target.value })}
            />
            <FieldError errors={errors} name="weight_kg" />
          </label>
        </div>

        <fieldset className={`${form.field} ${styles.genderSet}`} aria-describedby={errors.gender ? "gender-error" : undefined}>
          <legend className={`${form.label} ${styles.legend}`}>性別</legend>
          <div className={`${form.segmented} ${styles.genders}`}>
            {GENDERS.map((gender) => (
              <label
                key={gender.value}
                className={`${form.segment} ${styles.gender} ${value.gender === gender.value ? form.segmentActive : ''}`}
              >
                <input
                  type="radio"
                  name="gender"
                  required
                  aria-invalid={Boolean(errors.gender)}
                  checked={value.gender === gender.value}
                  onChange={() => onChange({ gender: gender.value })}
                />
                {gender.label}
              </label>
            ))}
          </div>
          <FieldError errors={errors} name="gender" />
          <span className={form.hint}>食事の目標の初期値に使います</span>
        </fieldset>
        <fieldset className={styles.genderSet} aria-describedby={errors.activity_level ? 'activity_level-error' : undefined}>
          <legend className={form.label}>普段の生活でどのくらい体を動かしますか？</legend>
          <div className={styles.activityOptions}>
            {ACTIVITY_LEVELS.map((activity) => (
              <label key={activity.value} className={styles.activityOption}>
                <input type="radio" name="activity_level" value={activity.value} checked={value.activity_level === activity.value} required aria-invalid={Boolean(errors.activity_level)} onChange={() => onChange({ activity_level: activity.value })} />
                <span><strong>{activity.label}</strong><small>{activity.description}</small></span>
              </label>
            ))}
          </div>
          <FieldError errors={errors} name="activity_level" />
          <p className={form.hint}>体格と普段の活動量から、現在の体重を維持する食事目標の目安を算出します。AI算出時は年齢・性別・身長・体重・活動量をOpenAIに送信します。</p>
        </fieldset>
      </section>
    </>
  )
}
