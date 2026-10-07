// 詳細画面の睡眠・ワークの記録一覧。記録ごとに開始・終了日時の修正と削除ができる（spec.md 2.1）。
// 計測中の記録は修正できない（ホームの「取り消し」を使う）。
import { useState } from 'react'
import { api } from '../../api/client.js'
import ErrorList from '../../components/ErrorList.jsx'
import { formatMinutes, fromDateTimeLocal, toDateTimeLocal } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import styles from './Details.module.css'
import { TIMED_KINDS } from './timedKinds.js'

const pad = (n) => String(n).padStart(2, '0')

// ISO → "10/6 23:45"
function formatShort(iso) {
  const date = new Date(iso)
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TimedRecordList({ kind, records, onChanged, onError }) {
  const config = TIMED_KINDS[kind]
  const [editingId, setEditingId] = useState(null)

  if (records.length === 0) return <p className={styles.empty}>この期間の記録はありません。</p>

  async function remove(record) {
    const label = `${formatShort(record[config.start])}〜 の${kind === 'sleep' ? '睡眠' : 'ワーク'}の記録`
    if (!window.confirm(`${label}を削除しますか？`)) return
    try {
      await api(`${config.path}/${record.id}`, { method: 'DELETE' })
      await onChanged()
    } catch (error) {
      onError(error.messages)
    }
  }

  return (
    <ul className={styles.records}>
      {records.map((record) =>
        editingId === record.id ? (
          <li key={record.id} className={styles.record}>
            <EditForm
              config={config}
              record={record}
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
              {config.hasTitle && record.title && <span className={styles.recordTitle}>{record.title}</span>}
              <span>
                {config.startLabel} {formatShort(record[config.start])} → {config.finishLabel}{' '}
                {record.in_progress ? '（計測中）' : formatShort(record[config.finish])}
              </span>
              {!record.in_progress && (
                <span className={styles.recordDuration}>
                  {config.durationLabel} {formatMinutes(record.duration_minutes)}
                </span>
              )}
            </div>
            {!record.in_progress && (
              <div className={styles.recordActions}>
                <button type="button" className={form.linkButton} onClick={() => setEditingId(record.id)}>
                  修正
                </button>
                <button type="button" className={`${form.linkButton} ${styles.danger}`} onClick={() => remove(record)}>
                  削除
                </button>
              </div>
            )}
          </li>
        ),
      )}
    </ul>
  )
}

function EditForm({ config, record, onCancel, onSaved }) {
  const [start, setStart] = useState(() => toDateTimeLocal(new Date(record[config.start])))
  const [finish, setFinish] = useState(() => toDateTimeLocal(new Date(record[config.finish])))
  const [title, setTitle] = useState(record.title || '')
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!start || !finish) return setErrors([`${config.startLabel}と${config.finishLabel}の日時を入力してください`])
    if (new Date(finish) <= new Date(start)) return setErrors([`${config.finishLabel}は${config.startLabel}より後にしてください`])
    setSaving(true)
    setErrors([])
    const body = { [config.start]: fromDateTimeLocal(start), [config.finish]: fromDateTimeLocal(finish) }
    if (config.hasTitle) body.title = title.trim()
    try {
      await api(`${config.path}/${record.id}`, { method: 'PATCH', body: { [config.key]: body } })
      await onSaved()
    } catch (error) {
      setErrors(error.messages)
      setSaving(false)
    }
  }

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
      {config.hasTitle && (
        <label className={form.field}>
          <span className={styles.editLabel}>内容</span>
          <input className={form.input} type="text" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      )}
      <label className={form.field}>
        <span className={styles.editLabel}>{config.startLabel}</span>
        <input className={form.input} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className={form.field}>
        <span className={styles.editLabel}>{config.finishLabel}</span>
        <input className={form.input} type="datetime-local" value={finish} onChange={(e) => setFinish(e.target.value)} />
      </label>
      <ErrorList errors={errors} />
      <div className={styles.editActions}>
        <button type="button" className={form.button} onClick={onCancel} disabled={saving}>
          キャンセル
        </button>
        <button type="submit" className={`${form.button} ${form.primary}`} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}
