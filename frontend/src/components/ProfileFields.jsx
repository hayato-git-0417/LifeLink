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
        <h3 className={form.cardTitle}>アイコンを選択</h3>
        <UserIconPicker value={value.icon} onChange={(icon) => onChange({ icon })} />
      </section>
      <label className={`${form.card} ${form.field}`}>
        <span className={form.cardTitle}>ユーザー名</span>
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
      <fieldset className={form.field}>
        <legend className={form.label}>性別（食事の目標の初期値に使います）</legend>
        <div className={styles.genders}>
          {GENDERS.map((gender) => (
            <label key={gender.value} className={form.radio}>
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
      </fieldset>
    </>
  )
}
