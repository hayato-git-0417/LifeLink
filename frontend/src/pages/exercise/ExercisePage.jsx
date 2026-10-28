import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import styles from './ExercisePage.module.css'

// ホームの上に重ねる運動タスクのポップアップ
export default function ExercisePage({ onClose, timer: externalTimer, now: externalNow, onToggleTimer }) {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(null)
  const [error, setError] = useState('')
  const [localTimer, setLocalTimer] = useState({ taskId: null, runningTaskId: null, startedAt: null, elapsedByTask: {} })
  const [localNow, setLocalNow] = useState(() => Date.now())
  const controlled = Boolean(externalTimer && onToggleTimer)
  const timer = controlled ? externalTimer : localTimer
  const now = controlled ? (externalNow ?? Date.now()) : localNow
  const close = onClose || (() => navigate('/'))

  useEffect(() => {
    let active = true
    api('/exercise_tasks/today')
      .then((data) => active && setTasks(data.exercise_tasks))
      .catch((reason) => active && setError(reason.messages?.[0] || '運動タスクを読み込めませんでした'))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (controlled || localTimer.runningTaskId === null) return undefined
    const interval = window.setInterval(() => setLocalNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [controlled, localTimer.runningTaskId])
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [close])

  function toggleTimer(taskId) {
    const starting = timer.runningTaskId !== taskId
    if (controlled) {
      onToggleTimer(taskId, tasks?.find((task) => task.id === taskId)?.title || '運動')
      if (starting) close()
      return
    }
    setLocalTimer((current) => {
      const elapsedByTask = { ...current.elapsedByTask }
      if (current.runningTaskId !== null) {
        elapsedByTask[current.runningTaskId] = (elapsedByTask[current.runningTaskId] || 0) + Math.floor((Date.now() - current.startedAt) / 1000)
      }
      if (current.runningTaskId === taskId) {
        return { ...current, runningTaskId: null, startedAt: null, elapsedByTask }
      }
      return { taskId, runningTaskId: taskId, startedAt: Date.now(), elapsedByTask }
    })
  }
  function openTaskSettings() {
    close()
    navigate('/settings/goal')
  }

  function formatElapsed(seconds = 0) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const remainder = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainder}`
  }

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={styles.popup} role="dialog" aria-modal="true" aria-label="運動">
        <button type="button" className={styles.close} onClick={close} aria-label="閉じる">×</button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!error && tasks === null && <p className={styles.empty}>読み込み中…</p>}
        {tasks?.length === 0 && <p className={styles.empty}>タスクがありません。＋追加から登録できます。</p>}
        <ul className={styles.taskList}>
          {(tasks || []).map((task) => {
            const running = timer.runningTaskId === task.id
            const elapsed = (timer.elapsedByTask[task.id] || 0) + (running ? Math.max(0, Math.floor((now - timer.startedAt) / 1000)) : 0)
            return (
              <li key={task.id}>
                <button
                  type="button"
                  className={`${styles.task} ${running ? styles.running : ''}`}
                  onClick={() => toggleTimer(task.id)}
                  aria-label={`${task.title} ${running ? '一時停止' : 'タイマー開始'}`}
                  aria-pressed={running}
                >
                  <span className={styles.play} aria-hidden="true">{running ? '⏸' : '▶'}</span>
                  <span className={styles.taskTitle}>{task.title}</span>
                  {(elapsed > 0 || running) && <time className={styles.timer}>{formatElapsed(elapsed)}</time>}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className={styles.add} onClick={openTaskSettings}>＋ 追加</button>
        <span className={styles.pointer} aria-hidden="true" />
      </section>
    </div>
  )
}
