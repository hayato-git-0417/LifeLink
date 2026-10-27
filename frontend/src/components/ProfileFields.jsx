// プロフィールの入力欄（アイコン・ユーザー名・生年月日・性別）。新規登録②とプロフィール変更（p.16）で使う
//   value: { icon, name, birthdate, gender } / onChange(changes)
import { toDateString } from '../lib/format.js'
import form from '../styles/form.module.css'
import styles from './ProfileFields.module.css'
import { UserIconPicker } from './UserIcon.jsx'

const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'unspecified', label: '回答しない' },
]

export default function ProfileFields({ value, onChange }) {
  return (
    <>
      <section className={form.card}>
        <h2 className={form.cardTitle}>アイコン</h2>
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
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label className={form.field}>
          <span className={form.label}>生年月日</span>
          <input
            className={`${form.input} ${styles.birthdate}`}
            type="date"
            min="1900-01-01"
            max={toDateString()}
            value={value.birthdate}
            onChange={(event) => onChange({ birthdate: event.target.value })}
          />
        </label>

        <div className={styles.bodyMeasurements}>
          <label className={form.field}>
            <span className={form.label}>身長（cm）</span>
            <input
              className={form.input}
              type="number"
              step="0.1"
              value={value.height_cm ?? ''}
              onChange={(event) => onChange({ height_cm: event.target.value })}
            />
          </label>

          <label className={form.field}>
            <span className={form.label}>体重（kg）</span>
            <input
              className={form.input}
              type="number"
              step="0.1"
              value={value.weight_kg ?? ''}
              onChange={(event) => onChange({ weight_kg: event.target.value })}
            />
          </label>
        </div>

        <fieldset className={`${form.field} ${styles.genderSet}`}>
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
                  checked={value.gender === gender.value}
                  onChange={() => onChange({ gender: gender.value })}
                />
                {gender.label}
              </label>
            ))}
          </div>
          <span className={form.hint}>食事の目標の初期値に使います</span>
        </fieldset>
      </section>
    </>
  )
}
