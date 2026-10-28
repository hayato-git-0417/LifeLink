// ホーム（spec.md 3.4・4章）。GET /api/v1/home を表示する。
// レイアウト: 部屋のイラスト（Room.jsx）を画面いっぱいに出し、左上にユーザー（押すとマイページ）、右上に通知ベルとメニュー、
// その下に「生活リズム」カード（今日の達成度。押すと記録の詳細）、中央にキャラと吹き出し、下に記録ボタン4つ（食事・ワーク・運動・睡眠）。
// 上部ヘッダー・下部ナビは出さない（マイページはユーザー、設定などはメニューから）。
// 睡眠・ワークは画面遷移せず、その場で start / finish を呼ぶ。計測中は「取消」も出す。
// 押したあとはホームを読み直すので、キャラの状態がすぐ変わる。睡眠中は夜の部屋になる
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell, { HeaderActions } from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { ChevronRightIcon, ExerciseIcon, FlameIcon, MealIcon, SleepIcon, SunIcon, WorkIcon } from '../../components/icons.jsx'
import UserIcon from '../../components/UserIcon.jsx'
import { formatElapsed, formatMinutes, formatTime } from '../../lib/format.js'
import ExercisePage from '../exercise/ExercisePage.jsx'
import styles from './HomePage.module.css'
import Room from './Room.jsx'

// 生活リズムカードの並び（デザインの順）
const ITEMS = [
  { key: 'meal', label: '食事' },
  { key: 'work', label: 'ワーク' },
  { key: 'exercise', label: '運動' },
  { key: 'sleep', label: '睡眠' },
]
const NOTICE_SECONDS = 5

// 計測中は1秒ごとに今の時刻を更新する（ワークの経過時間）
function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

export default function HomePage() {
  const { user, setUnreadCount } = useAuth()
  const [home, setHome] = useState(null)
  const [errors, setErrors] = useState([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [exerciseOpen, setExerciseOpen] = useState(false)
  const [exerciseTimer, setExerciseTimer] = useState({ taskId: null, taskTitle: '', runningTaskId: null, startedAt: null, elapsedByTask: {}, active: false })

  const load = useCallback(async () => {
    const data = await api('/home')
    setHome(data)
    setUnreadCount(data.unread_notifications_count)
  }, [setUnreadCount])

  useEffect(() => {
    load().catch((error) => setErrors(error.messages))
  }, [load])

  // お知らせ（おはよう・おつかれさま）は少したったら消す
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), NOTICE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  const sleepTimer = home?.timers.sleep
  const workTimer = home?.timers.work
  const exerciseRunning = exerciseTimer.runningTaskId !== null
  const now = useNow(Boolean(workTimer) || exerciseRunning)
  const exerciseElapsed = exerciseTimer.taskId === null ? 0 : (exerciseTimer.elapsedByTask[exerciseTimer.taskId] || 0) + (exerciseTimer.runningTaskId === exerciseTimer.taskId ? Math.max(0, Math.floor((now - exerciseTimer.startedAt) / 1000)) : 0)

  // kind: sleep_records / work_records、action: start / finish / cancel
  async function act(kind, action, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    setBusy(true)
    setErrors([])
    setNotice('')
    try {
      const data = await api(`/${kind}/${action}`, { method: 'POST' })
      await load()
      // お知らせはホームを読み直してから出す（ボタンの表示と食い違わないように）
      const autoFinished = data?.auto_finished_work_record
      if (autoFinished) setNotice(`計測中のワークを終了しました（${formatMinutes(autoFinished.duration_minutes)}）`)
      if (kind === 'sleep_records' && action === 'finish') {
        setNotice(`おはよう！ 睡眠時間は ${formatMinutes(data.sleep_record.duration_minutes)} でした`)
      }
      if (kind === 'work_records' && action === 'finish') {
        setNotice(`おつかれさま！ ワーク ${formatMinutes(data.work_record.duration_minutes)}`)
      }
    } catch (error) {
      setErrors(error.messages)
      await load().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  function toggleExerciseTimer(taskId, taskTitle) {
    setNotice('')
    setExerciseTimer((current) => {
      const elapsedByTask = { ...current.elapsedByTask }
      const taskTitlesById = { ...(current.taskTitlesById || {}), [taskId]: taskTitle }
      if (current.runningTaskId !== null) {
        const elapsed = Math.floor((Date.now() - current.startedAt) / 1000)
        elapsedByTask[current.runningTaskId] = (elapsedByTask[current.runningTaskId] || 0) + elapsed
      }
      if (current.runningTaskId === taskId) {
        return { ...current, runningTaskId: null, startedAt: null, elapsedByTask, active: true }
      }
      return { taskId, taskTitle, runningTaskId: taskId, startedAt: Date.now(), elapsedByTask, active: true }
    })
  }
  function closeExercisePopup() {
    setExerciseOpen(false)
  }
  async function finishExerciseTimer() {
    const taskId = exerciseTimer.taskId
    const elapsedByTask = { ...exerciseTimer.elapsedByTask }
    if (exerciseTimer.runningTaskId !== null) {
      elapsedByTask[exerciseTimer.runningTaskId] = (elapsedByTask[exerciseTimer.runningTaskId] || 0) + Math.max(0, Math.floor((Date.now() - exerciseTimer.startedAt) / 1000))
    }
    const savedSecondsByTask = { ...(exerciseTimer.savedSecondsByTask || {}) }
    const taskTitlesById = exerciseTimer.taskTitlesById || {}
    const pendingRecords = Object.entries(elapsedByTask).flatMap(([id, seconds]) => {
      const totalMinutes = seconds > 0 ? Math.ceil(seconds / 60) : 0
      const alreadySavedMinutes = Math.ceil((savedSecondsByTask[id] || 0) / 60)
      const minutes = Math.max(0, totalMinutes - alreadySavedMinutes)
      return minutes > 0 ? [{ taskId: id, seconds, duration_minutes: minutes, memo: taskTitlesById[id] || (id === String(taskId) ? exerciseTimer.taskTitle : '') || '運動' }] : []
    })
    setBusy(true)
    setErrors([])
    try {
      if (pendingRecords.length > 0) {
        await api('/exercise_records', {
          method: 'POST',
          body: { exercise_records: pendingRecords.map(({ duration_minutes, memo }) => ({ duration_minutes, memo })) },
        })
      }
      const nextSavedSeconds = { ...savedSecondsByTask }
      pendingRecords.forEach((record) => { nextSavedSeconds[record.taskId] = record.seconds })
      setExerciseTimer((current) => ({
        ...current,
        runningTaskId: null,
        startedAt: null,
        active: false,
        elapsedByTask,
        savedSecondsByTask: nextSavedSeconds,
      }))
    setExerciseOpen(false)
    const currentSeconds = taskId === null ? 0 : (elapsedByTask[taskId] || 0)
    setNotice(`おつかれさま！ ${exerciseTimer.taskTitle || '運動'} ${formatMinutes(currentSeconds > 0 ? Math.floor(currentSeconds / 60) : 0)}`)
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusy(false)
    }
  }
  function cancelExerciseTimer() {
    if (!window.confirm('運動の計測を取り消しますか？（この項目の記録時間も破棄されます）')) return
    setExerciseTimer({ taskId: null, runningTaskId: null, startedAt: null, elapsedByTask: {}, active: false })
    setExerciseOpen(false)
  }
  const sleeping = home?.character.state === 'sleeping'

  return (
    <AppShell bare>
      <div className={`${styles.room} ${sleeping ? styles.night : ''}`}>
        <Room />

        <header className={styles.top}>
          <Link to="/mypage" className={styles.userCard}>
            <UserIcon icon={user?.icon} size={42} />
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.streak}>
              <span className={styles.streakLabel}>継続日数</span>
              {/* 継続日数を返す API はまだないので仮表示（decisions.md） */}
              <span className={styles.streakValue}>
                〇日
                <FlameIcon size={16} />
              </span>
            </span>
            <span className={styles.srOnly}>（マイページを開く）</span>
          </Link>
          <div className={styles.actions}>
            <HeaderActions />
          </div>
        </header>

        {home && (
          <Link to="/details" className={styles.rhythm}>
            <span className={styles.rhythmHead}>
              <span className={styles.rhythmTitle}>生活リズム</span>
              <strong className={styles.rhythmTotal}>{Math.round(home.today.total_percent)}%</strong>
              <ChevronRightIcon size={16} className={styles.rhythmMore} />
            </span>
            {ITEMS.map(({ key, label }) => {
              const score = Math.round(home.today.scores[key])
              return (
                <span key={key} className={styles.row}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.bar}>
                    {/* ワークは 100% を超えることがあるので、ゲージは 100 で頭打ち */}
                    {score > 0 && (
                      <span className={`${styles.fill} ${styles[`fill_${key}`]}`} style={{ width: `${Math.min(score, 100)}%` }} />
                    )}
                  </span>
                  <span className={styles.percent}>{score}%</span>
                </span>
              )
            })}
            <span className={styles.srOnly}>（記録の詳細を見る）</span>
          </Link>
        )}

        <section className={styles.stage}>
          {!home ? (
            !errors.length && <p className={styles.loading}>読み込み中…</p>
          ) : (
            <>
              {home.message && <p className={styles.bubble}>{home.message}</p>}
              <div className={styles.spot}>
                <span className={styles.rug} aria-hidden="true" />
                <img
                  className={`${styles.character} ${styles[`anim_${home.character.state}`] || styles.anim_normal}`}
                  src={home.character.image_path}
                  alt={`${home.character.name}（${home.character.state_label}）`}
                />
              </div>
            </>
          )}
        </section>

        <div className={styles.toasts} aria-live="polite">
          {notice && <p className={styles.notice}>{notice}</p>}
          <ErrorList errors={errors} />
        </div>

        {home && (
          <nav className={styles.buttons} aria-label="記録">
            <Link to="/meals" className={`${styles.button} ${styles.meal}`}>
              <MealIcon className={styles.buttonIcon} />
              <span>食事</span>
            </Link>
            <TimerSlot
              active={Boolean(workTimer)}
              busy={busy}
              cancelLabel="ワークの計測を取り消す"
              onCancel={() => act('work_records', 'cancel', 'ワークの計測を取り消しますか？（記録は残りません）')}
            >
              <button
                type="button"
                className={`${styles.button} ${styles.work} ${workTimer ? styles.running : ''}`}
                disabled={busy || (sleeping && !workTimer)}
                onClick={() => act('work_records', workTimer ? 'finish' : 'start')}
                title={sleeping ? '睡眠中はワークを開始できません' : undefined}
                aria-label={workTimer ? 'ワーク終了' : 'ワーク開始'}
              >
                <WorkIcon className={styles.buttonIcon} />
                <span className={styles.timerText}>
                  {workTimer ? formatElapsed(now - new Date(workTimer.started_at).getTime()) : 'ワーク'}
                </span>
              </button>
            </TimerSlot>
            <TimerSlot
              active={exerciseTimer.active}
              busy={false}
              cancelLabel="運動の計測を取り消す"
              onCancel={cancelExerciseTimer}
            >
              <button
                type="button"
                className={`${styles.button} ${styles.exercise} ${exerciseTimer.active ? styles.running : ''}`}
                disabled={busy}
                onClick={() => exerciseTimer.runningTaskId !== null ? finishExerciseTimer() : setExerciseOpen(true)}
                aria-label={exerciseTimer.runningTaskId !== null ? '運動終了' : '運動を記録'}
              >
                 <ExerciseIcon className={styles.buttonIcon} />
                {exerciseTimer.active && exerciseTimer.taskTitle && (
                  <span className={styles.exerciseActivity} title={exerciseTimer.taskTitle}>
                    {exerciseTimer.runningTaskId !== null ? `${exerciseTimer.taskTitle}中…` : `${exerciseTimer.taskTitle}（一時停止）`}
                  </span>
                )}
                <span className={styles.timerText}>{exerciseTimer.active ? formatElapsed(exerciseElapsed * 1000) : '運動'}</span>
              </button>
            </TimerSlot>
            <TimerSlot
              active={Boolean(sleepTimer)}
              busy={busy}
              cancelLabel="睡眠の計測を取り消す"
              onCancel={() => act('sleep_records', 'cancel', '睡眠の計測を取り消しますか？（記録は残りません）')}
            >
             <button
                type="button"
                className={`${styles.button} ${styles.sleep} ${sleepTimer ? styles.running : ''}`}
                disabled={busy}
                onClick={() => act('sleep_records', sleepTimer ? 'finish' : 'start')}
                aria-label={sleepTimer ? `起床（${formatTime(sleepTimer.slept_at)} から睡眠中）` : '就寝'}
              >
                {sleepTimer ? <SunIcon className={styles.buttonIcon} /> : <SleepIcon className={styles.buttonIcon} />}
                <span className={styles.timerText}>{sleepTimer ? '起床' : '睡眠'}</span>
                {sleepTimer && <small className={styles.since}>{formatTime(sleepTimer.slept_at)}〜</small>}
              </button>
            </TimerSlot>
          </nav>
        )}
      </div>
      {exerciseOpen && <ExercisePage onClose={closeExercisePopup} timer={exerciseTimer} now={now} onToggleTimer={toggleExerciseTimer} completionNotice={notice.startsWith('おつかれさま！') ? notice : ''} />}
    </AppShell>
  )
}

// 睡眠・ワークのボタン。計測中はボタンの右上に小さな「取消」を重ねる
function TimerSlot({ active, busy, cancelLabel, onCancel, children }) {
  return (
    <div className={styles.slot}>
      {children}
      {active && (
        <button type="button" className={styles.cancel} disabled={busy} onClick={onCancel} aria-label={cancelLabel} title={cancelLabel}>
          取消
        </button>
      )}
    </div>
  )
}
