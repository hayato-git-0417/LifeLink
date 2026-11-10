// ホーム（spec.md 3.4・4章）。GET /api/v1/home を表示する。
// レイアウト: 部屋のイラスト（Room.jsx）を画面いっぱいに出し、左上にユーザー（継続日数つき。押すとマイページ）、右上に通知ベルとメニュー、
// その下に進化カード（累計ポイント・段階・ゲージ・今日の倍率。EvolutionCard.jsx）、中央にキャラと吹き出し、下に記録ボタン4つ（食事・ワーク・運動・睡眠）。
// 今日の達成度（生活リズム）は記録の詳細（メニュー）で見る。
// 上部ヘッダー・下部ナビは出さない（マイページはユーザー、設定などはメニューから）。
// 睡眠・ワークは画面遷移せず、その場で start / finish を呼ぶ。計測中は「取消」も出す。
// 押したあとはホームを読み直すので、キャラの状態がすぐ変わる。睡眠中は夜の部屋になる
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell, { HeaderActions } from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { ExerciseIcon, FlameIcon, MealIcon, SleepIcon, SunIcon, WorkIcon } from '../../components/icons.jsx'
import UserIcon from '../../components/UserIcon.jsx'
import { formatElapsed, formatMinutes, formatTime } from '../../lib/format.js'
import ExercisePage from '../exercise/ExercisePage.jsx'
import EvolutionCard from './EvolutionCard.jsx'
import styles from './HomePage.module.css'
import StateBadge from './StateBadge.jsx'
//import Room from './Room.jsx'
import { CHARACTER_MESSAGES } from './characterMessages.js'

const NOTICE_SECONDS = 5
const STAGE_CHANGE_SECONDS = 4

// 進化のテストパネルは開発中（npm run dev）だけ読み込む。本番のビルドでは null になり、ファイルごと入らない
const EvolutionDevPanel = import.meta.env.DEV ? lazy(() => import('./EvolutionDevPanel.jsx')) : null

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
  const [speechVisible, setSpeechVisible] = useState(false)
  const speechTimerRef = useRef(null)
  const characterSoundRef = useRef(null)
  const jumpAnimationRef = useRef(null)
  const [characterTapLocked, setCharacterTapLocked] = useState(false)
  const [speechText, setSpeechText] = useState('')

  // 進化の段階が前に読んだときから変わったら、進化・退化の演出を出す（開いた直後の1回目は出さない）
  const stageRef = useRef(null)
  const [stageChange, setStageChange] = useState(null)

  const load = useCallback(async () => {
    const data = await api('/home')
    const previousStage = stageRef.current
    const stage = data.evolution.stage
    stageRef.current = stage
    if (previousStage !== null && previousStage !== stage) {
      setStageChange({ up: stage > previousStage, stage, name: data.character.name, key: Date.now() })
    }
    setHome(data)
    setUnreadCount(data.unread_notifications_count)
  }, [setUnreadCount])

  useEffect(() => {
    if (!stageChange) return undefined
    const timer = setTimeout(() => setStageChange(null), STAGE_CHANGE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [stageChange])

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
  
  /* 吹き出し */
  function cancelExerciseTimer() {
    if (!window.confirm('運動の計測を取り消しますか？（この項目の記録時間も破棄されます）')) return
    setExerciseTimer({ taskId: null, runningTaskId: null, startedAt: null, elapsedByTask: {}, active: false })
    setExerciseOpen(false)
  }
  const sleeping = home?.character.state === 'sleeping'

  // ホーム画面を離れたら、残っている予約を取り消す
  useEffect(() => {
    return () => clearTimeout(speechTimerRef.current)
  }, [])


  /*【ホーム画面のキャラタップ時の効果音】*/
  function handleCharacterTap(event) {
    if (characterTapLocked) return
    setCharacterTapLocked(true)
    
    // 連続タップしたら、前のジャンプを止めてやり直す
    jumpAnimationRef.current?.cancel()

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      jumpAnimationRef.current = event.currentTarget.animate(
        [
          { transform: 'translateY(0)', easing: 'ease-out' },
          {
            transform: 'translateY(-15px)',
            offset: 0.45,
            easing: 'ease-in',
          },
          { transform: 'translateY(0)' },
        ],
        { duration: 300 }
      )
    }
    const state = home.character.state
    const messages = CHARACTER_MESSAGES[state] ?? [home.message].filter(Boolean)

    if (messages.length === 0) return

    const index = Math.floor(Math.random() * messages.length)
    setSpeechText(messages[index])

    const sound = characterSoundRef.current
    if (sound) {
      sound.currentTime = 0
      sound.play().catch((error) => {
        console.warn('キャラの効果音を再生できませんでした', error)
      })
    }

    clearTimeout(speechTimerRef.current)
    setSpeechVisible(true)

    speechTimerRef.current = setTimeout(() => {
      setSpeechVisible(false)
      speechTimerRef.current = null
    }, 3000)
  }

  // 1秒後に押せる処理
  useEffect(() => {
    if (!characterTapLocked) return

    const timer = setTimeout(() => {
      setCharacterTapLocked(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [characterTapLocked])

  useEffect(() => {
    const sound = new Audio('/sounds/character-tap.mp3')
    sound.volume = 0.3
    characterSoundRef.current = sound

    return () => {
      clearTimeout(speechTimerRef.current)
      jumpAnimationRef.current?.cancel()
      sound.pause()
      characterSoundRef.current = null
    }
  }, [])


  return (
    <AppShell bare>
      <div className={`${styles.room} ${sleeping ? styles.night : ''}`}>
        <div className={styles.floor} aria-hidden="true" />
        
        {/* <Room /> */}

        <header className={styles.top}>
          <Link to="/mypage" className={styles.userCard}>
            <UserIcon icon={user?.icon} size={42} />
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.streak}>
              <span className={styles.streakLabel}>継続日数</span>
              {/* 記録した日が続いている日数（spec.md 4.3）。読み込み中は「‐」 */}
              <span className={styles.streakValue}>
                {home ? home.evolution.streak_days : '‐'}日
                <FlameIcon size={16} />
              </span>
            </span>
            <span className={styles.srOnly}>（マイページを開く）</span>
          </Link>
          <div className={styles.actions}>
            <HeaderActions />
          </div>
        </header>

        {home && <EvolutionCard evolution={home.evolution} />}

        <section className={styles.stage}>
          {!home ? (
            !errors.length && <p className={styles.loading}>読み込み中…</p>
          ) : (
            <>
              {/* 吹き出し */}
              {speechVisible && speechText && (
                <p className={styles.bubble}>{speechText}</p>
              )}

              <div
                key={stageChange?.key}
                className={`${styles.spot} ${stageChange ? (stageChange.up ? styles.spotEvolved : styles.spotDevolved) : ''}`}
              >
                {/* <span className={styles.rug} aria-hidden="true" /> */}

                {/* キャラ画像。段階の絵が状態を表していないときは、右上に状態のマークを重ねる */}
                <div className={styles.figure}>
                  <button
                    type="button"
                    data-click-sound="custom"
                    disabled={characterTapLocked}
                    className={styles.characterButton}
                    aria-label={`${home.character.name}に話しかける`}
                    onClick={handleCharacterTap}
                  >
                    <img
                      className={`${styles.character} ${styles[`anim_${home.character.state}`] || styles.anim_normal}`}
                      src={home.character.image_path}
                      alt={`${home.character.name}（${home.character.state_label}）`}
                    />
                  </button>
                  {!home.character.image_shows_state && (
                    <StateBadge key={home.character.state} state={home.character.state} label={home.character.state_label} />
                  )}
                </div>

              </div>
            </>
          )}
        </section>

        <div className={styles.toasts} aria-live="polite">
          {stageChange && (
            <p className={`${styles.notice} ${stageChange.up ? styles.evolved : styles.devolved}`}>
              {stageChange.up
                ? `${stageChange.name}が進化した！（進化${stageChange.stage}）`
                : `${stageChange.name}が退化してしまった…（進化${stageChange.stage}）`}
            </p>
          )}
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

        {EvolutionDevPanel && home && (
          <Suspense fallback={null}>
            <EvolutionDevPanel onChanged={load} />
          </Suspense>
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
