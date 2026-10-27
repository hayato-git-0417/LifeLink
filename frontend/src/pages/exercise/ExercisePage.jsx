// 運動（デザイン p.18）。タスクのチェックリスト（未完了の警告）、移動距離の手入力、移動距離の7日グラフ。
// 運動タイマーは作らない（spec.md 2章）。チェックを付けると、キャラは30分間「汗汗」になる
import { useCallback, useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import { axisTick, CATEGORY_COLORS, CHART, tooltipProps } from '../../components/chartTheme.js'
import ErrorList from '../../components/ErrorList.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import { CheckIcon, CloseIcon, ExerciseIcon, RouteIcon } from '../../components/icons.jsx'
import { formatDay, formatNumber, formatTime, toDateString } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import styles from './ExercisePage.module.css'

export default function ExercisePage() {
  const [tasks, setTasks] = useState(null)
  const [distance, setDistance] = useState(null)
  const [errors, setErrors] = useState([])
  const [busyTask, setBusyTask] = useState(null)
  const [km, setKm] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTasks = useCallback(() => api('/exercise_tasks/today').then(setTasks), [])
  const loadDistance = useCallback(() => api('/exercise_records').then(setDistance), [])

  useEffect(() => {
    Promise.all([loadTasks(), loadDistance()]).catch((error) => setErrors(error.messages))
  }, [loadTasks, loadDistance])

  async function toggle(task) {
    setBusyTask(task.id)
    setErrors([])
    try {
      await api(`/exercise_tasks/${task.id}/completion`, { method: task.completed ? 'DELETE' : 'POST' })
      await loadTasks()
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusyTask(null)
    }
  }

  async function addDistance(event) {
    event.preventDefault()
    if (!(Number(km) > 0)) return setErrors(['移動距離は0より大きい数で入力してください'])
    setSaving(true)
    setErrors([])
    try {
      await api('/exercise_records', { method: 'POST', body: { exercise_record: { distance_km: km, memo: memo.trim() } } })
      setKm('')
      setMemo('')
      await loadDistance()
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setSaving(false)
    }
  }

  async function removeDistance(record) {
    if (!window.confirm(`${formatNumber(record.distance_km)} km の記録を削除しますか？`)) return
    try {
      await api(`/exercise_records/${record.id}`, { method: 'DELETE' })
      await loadDistance()
    } catch (error) {
      setErrors(error.messages)
    }
  }

  const remaining = tasks ? tasks.total_count - tasks.completed_count : 0
  const today = toDateString()
  const todayRecords = distance?.exercise_records.filter((record) => record.recorded_on === today) ?? []
  const chart = distance?.daily_totals.map((day) => ({ day: formatDay(day.date), km: day.distance_km })) ?? []

  return (
    <AppShell title="運動" backTo="/">
      <ErrorList errors={errors} />
      {!tasks || !distance ? (
        !errors.length && <p className={form.loading}>読み込み中…</p>
      ) : (
        <div className={styles.page}>
          <section className={form.card}>
            <div className={form.panelHead}>
              <IconBadge tone="exercise">
                <ExerciseIcon size={20} />
              </IconBadge>
              <h2>今日のタスク</h2>
              <span className={`${styles.progress} ${remaining === 0 && tasks.total_count > 0 ? styles.progressDone : ''}`}>
                {tasks.completed_count} / {tasks.total_count}
              </span>
            </div>
            {remaining > 0 && <p className={styles.warning}>未完のタスクがあります</p>}
            {tasks.exercise_tasks.length === 0 ? (
              <p className={styles.empty}>運動タスクがありません。設定 → 目標の設定 から登録してください。</p>
            ) : (
              <ul className={styles.tasks}>
                {tasks.exercise_tasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={task.completed}
                      className={`${styles.task} ${task.completed ? styles.done : ''}`}
                      onClick={() => toggle(task)}
                      disabled={busyTask === task.id}
                    >
                      <span className={styles.check} aria-hidden="true">
                        {task.completed && <CheckIcon size={18} strokeWidth={3.2} />}
                      </span>
                      <span className={styles.taskTitle}>{task.title}</span>
                      {task.completed && <span className={styles.doneLabel}>できた</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={form.card}>
            <div className={form.panelHead}>
              <IconBadge tone="exercise">
                <RouteIcon size={20} />
              </IconBadge>
              <h2>移動距離</h2>
            </div>
            <form className={styles.distanceForm} onSubmit={addDistance} noValidate>
              <span className={styles.kmField}>
                <input
                  className={`${form.input} ${styles.km}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="2.5"
                  value={km}
                  onChange={(event) => setKm(event.target.value)}
                  aria-label="移動距離（km）"
                />
                <span className={styles.kmUnit}>km</span>
              </span>
              <input
                className={`${form.input} ${styles.memo}`}
                type="text"
                maxLength={255}
                placeholder="メモ（任意）"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                aria-label="メモ"
              />
              <button type="submit" className={`${form.button} ${form.primary} ${styles.add}`} disabled={saving}>
                記録
              </button>
            </form>
            {todayRecords.length > 0 && (
              <ul className={styles.records}>
                {todayRecords.map((record) => (
                  <li key={record.id}>
                    <span className={styles.recordTime}>{formatTime(record.started_at)}</span>
                    <span className={styles.recordKm}>{formatNumber(record.distance_km)} km</span>
                    <span className={styles.recordMemo}>{record.memo}</span>
                    <button type="button" className={styles.remove} onClick={() => removeDistance(record)} aria-label="削除">
                      <CloseIcon size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.chart}>
              <span className={styles.unit}>7日間（km）</span>
              <ResponsiveContainer width="100%" height={136}>
                <BarChart data={chart} margin={{ top: 8, right: 4, bottom: 0, left: -26 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tick={axisTick} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip formatter={(value) => [`${value} km`, '移動距離']} {...tooltipProps} />
                  <Bar
                    dataKey="km"
                    fill={CATEGORY_COLORS.exercise}
                    stroke={CHART.ink}
                    strokeWidth={2}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
