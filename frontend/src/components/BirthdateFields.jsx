import { useState } from 'react'
import { toDateString } from '../lib/format.js'
import { birthdateParts, updateBirthdate, birthdateLimits } from './birthdate.js'
import FieldError from './FieldError.jsx'
import form from '../styles/form.module.css'
import styles from './ProfileFields.module.css'

export default function BirthdateFields({ value = '', onChange, errors = {} }) {
  const today = toDateString()
  const [draft, setDraft] = useState(() => ({ ...birthdateParts(value), value }))
  // Keep partial selections while the parent holds an empty, incomplete date.
  if (value !== draft.value) setDraft({ ...birthdateParts(value), value })
  const limits = birthdateLimits(draft, today)
  const currentYear = Number(today.slice(0, 4))
  const fields = [
    { key: 'year', label: '年', values: Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i) },
    { key: 'month', label: '月', values: Array.from({ length: limits.month }, (_, i) => i + 1) },
    { key: 'day', label: '日', values: Array.from({ length: limits.day }, (_, i) => i + 1) },
  ]

  function change(key, value) {
    const next = updateBirthdate(draft, key, value, today)
    setDraft(next)
    onChange(next.value)
  }

  return (
    <fieldset className={styles.birthdateSet}>
      <legend className={form.label}>生年月日</legend>
      <div className={styles.birthdate}>
        {fields.map(({ key, label, values }) => (
          <label key={key} className={form.field}>
            <span className={form.hint}>{label}</span>
            <select
              className={form.input}
              aria-label={'生まれた' + label}
              aria-invalid={Boolean(errors.birthdate)}
              aria-describedby={errors.birthdate ? 'birthdate-error' : undefined}
              autoComplete={'bday-' + key}
              required
              value={draft[key]}
              onChange={(event) => change(key, event.target.value)}
            >
              <option value="">{label}を選択</option>
              {values.map((number) => <option key={number} value={number}>{number}{label}</option>)}
            </select>
          </label>
        ))}
        <label className={styles.calendarPicker} title="カレンダーから選択">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" />
          </svg>
          <input
            className={styles.calendarInput}
            type="date"
            aria-label="カレンダーから生年月日を選択"
            aria-invalid={Boolean(errors.birthdate)}
            aria-describedby={errors.birthdate ? 'birthdate-error' : undefined}
            min="1900-01-01"
            max={today}
            value={value}
            onClick={(event) => {
              try { event.currentTarget.showPicker?.() } catch { /* Use the browser's default date control. */ }
            }}
            onChange={(event) => {
              const date = event.target.value
              if (date && (date < '1900-01-01' || date > today)) return
              setDraft({ ...birthdateParts(date), value: date })
              onChange(date)
            }}
          />
        </label>
      </div>
      <FieldError errors={errors} name="birthdate" />
    </fieldset>
  )
}
