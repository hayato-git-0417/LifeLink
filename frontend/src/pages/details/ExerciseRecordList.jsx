import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import ErrorList from '../../components/ErrorList.jsx'
import { formatDate, formatMinutes, formatNumber } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import styles from './Details.module.css'

export default function ExerciseRecordList({ records = [], taskTitles = [], readOnly = false, onChanged, onError }) {
  const [editingId, setEditingId] = useState(null)
  const [registeredTaskTitles, setRegisteredTaskTitles] = useState([])
  const sorted = [...(records || [])].sort((a, b) => new Date(b.started_at) - new Date(a.started_at))

   useEffect(() => {
    let active = true
    api('/exercise_tasks/today')
      .then((data) => {
        if (active) setRegisteredTaskTitles((data.exercise_tasks || []).map((task) => task.title))
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const allTaskTitles = [...new Set([
    ...(Array.isArray(taskTitles) ? taskTitles : []),
    ...registeredTaskTitles,
  ].filter(Boolean))]

  if (sorted.length === 0) return <p className={styles.empty}>この期間の記録はありません。</p>

  async function remove(record) {
    const label = record.duration_minutes != null ? `${record.memo || '運動'}の記録` : '移動距離の記録'
    if (!window.confirm(`${label}を削除しますか？`)) return
    try {
      await api(`/exercise_records/${record.id}`, { method: 'DELETE' })
      await onChanged()
    } catch (error) {
      onError(error.messages)
    }
  }

  return (
    <ul className={styles.records}>
      {sorted.map((record) => {
        const isTimer = record.duration_minutes != null
        return editingId === record.id ? (
          <li key={record.id} className={styles.record}>
            <EditExerciseRecord
              record={record}
              isTimer={isTimer}
              taskTitles={taskTitles}
              onCancel={() => setEditingId(null)}
              onSaved={async () => {
                setEditingId(null)
                await onChanged()
              }}
            />
          </li>
        ) : (
          <li key={record.id} className={styles.record}>
            <div className={styles.recordMain}>
              <span className={styles.recordTitle}>{formatDate(record.recorded_on)}</span>
              {isTimer ? (
                <>
                  <span className={styles.recordStrong}>{record.memo || '運動'}</span>
                  <span className={styles.recordSub}>運動時間 <b>{formatMinutes(record.duration_minutes)}</b></span>
                </>
              ) : (
                <>
                  {record.memo && <span className={styles.recordSub}>{record.memo}</span>}
                  <span className={styles.recordSub}>移動距離 <b>{formatNumber(record.distance_km)} km</b></span>
                </>
              )}
            </div>
            {!readOnly && (
              <div className={styles.recordActions}>
                <button type="button" className={styles.smallButton} onClick={() => setEditingId(record.id)}>修正</button>
                <button type="button" className={`${styles.smallButton} ${styles.smallDanger}`} onClick={() => remove(record)}>削除</button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function EditExerciseRecord({ record, isTimer, taskTitles = [], onCancel, onSaved }) {
  const [memo, setMemo] = useState(record.memo || '')
  const [duration, setDuration] = useState(String(record.duration_minutes ?? ''))
  const [distance, setDistance] = useState(String(record.distance_km ?? ''))
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const exerciseOptions = [...new Set([...(Array.isArray(taskTitles) ? taskTitles : []), record.memo].filter(Boolean))]

  async function handleSubmit(event) {
    event.preventDefault()
    if (isTimer && !memo.trim()) return setErrors(['運動項目名を入力してください'])
    if (isTimer && !(Number(duration) > 0)) return setErrors(['運動時間は0より大きい分数を入力してください'])
        if (!isTimer && !(Number(distance) > 0)) return setErrors(['移動距離は0より大きい数で入力してください'])
    setSaving(true)
    setErrors([])
    const exerciseRecord = isTimer
      ? { memo: memo.trim(), duration_minutes: Number(duration) }
      : { memo: memo.trim(), distance_km: Number(distance) }
    try {
      await api(`/exercise_records/${record.id}`, { method: 'PATCH', body: { exercise_record: exerciseRecord } })
      await onSaved()
    } catch (error) {
      setErrors(error.messages)
      setSaving(false)
    }
  }

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
      <label className={form.field}>
        <span className={styles.editLabel}>{isTimer ? '運動項目' : 'メモ'}</span>
        {isTimer ? (
          <select className={form.input} value={memo} onChange={(event) => setMemo(event.target.value)}>
            {exerciseOptions.map((title) => <option key={title} value={title}>{title}</option>)}
          </select>
        ) : (
          <input className={form.input} type="text" maxLength={255} value={memo} onChange={(event) => setMemo(event.target.value)} />
        )}
      </label>
      <label className={form.field}>
        <span className={styles.editLabel}>{isTimer ? '運動時間（分）' : '移動距離（km）'}</span>
        <input
          className={form.input}
          type="number"
          min="0.01"
          step={isTimer ? '1' : '0.01'}
          value={isTimer ? duration : distance}
          onChange={(event) => isTimer ? setDuration(event.target.value) : setDistance(event.target.value)}
        />
      </label>
      <ErrorList errors={errors} />
      <div className={styles.editActions}>
        <button type="button" className={form.button} onClick={onCancel} disabled={saving}>キャンセル</button>
        <button type="submit" className={`${form.button} ${form.primary}`} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </form>
  )
}
