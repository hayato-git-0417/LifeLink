// ホーム（デザイン p.1 / p.2、spec.md 3.4・4章）。GET /api/v1/home を表示する。
// 就寝⇔起床・ワーク開始⇔ワーク終了は画面遷移せず、その場で start / finish を呼ぶ。計測中は「取り消し」も出す。
// 押したあとはホームを読み直すので、キャラの状態がすぐ変わる。
// スマホ（375×667）でスクロールせずに収まるように、ゲージは2列、記録ボタンは3列×2段にしている。
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { formatElapsed, formatMinutes, formatTime } from '../../lib/format.js'
import styles from './HomePage.module.css'

const ITEMS = [
  { key: 'sleep', label: '睡眠' },
  { key: 'meal', label: '食事' },
  { key: 'exercise', label: '運動' },
  { key: 'work', label: 'ワーク' },
]
const MAX_POINTS = 1000

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
  const { setUnreadCount } = useAuth()
  const [home, setHome] = useState(null)
  const [errors, setErrors] = useState([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const data = await api('/home')
    setHome(data)
    setUnreadCount(data.unread_notifications_count)
  }, [setUnreadCount])

  useEffect(() => {
    load().catch((error) => setErrors(error.messages))
  }, [load])

  const sleepTimer = home?.timers.sleep
  const workTimer = home?.timers.work
  const now = useNow(Boolean(workTimer))

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

  if (!home) {
    return (
      <AppShell title="">
        <ErrorList errors={errors} />
        {!errors.length && <p className={styles.loading}>読み込み中…</p>}
      </AppShell>
    )
  }

  const { character, today } = home
  const sleeping = character.state === 'sleeping'

  return (
    <AppShell title="">
      <div className={styles.page}>
        <section className={`${styles.stage} ${sleeping ? styles.night : styles.day}`}>
          <span className={`${styles.mood} ${styles[`mood_${character.mood.key}`] || ''}`}>
            <span className={styles.moodFace} aria-hidden="true" />
            {character.mood.label}
          </span>
          <img
            className={`${styles.character} ${styles[`anim_${character.state}`] || styles.anim_normal}`}
            src={character.image_path}
            alt={`${character.name}（${character.state_label}）`}
          />
          <span className={styles.stateLabel}>
            {character.name}・{character.state_label}
          </span>
        </section>

        <p className={styles.bubble}>{home.message}</p>

        <section className={styles.gauges} aria-label="ポイント">
          {ITEMS.map(({ key, label }) => {
            const points = character.points[key]
            const score = today.scores[key]
            return (
              <div key={key} className={styles.gauge}>
                <span className={styles.gaugeLabel}>{label}</span>
                <span className={styles.today}>今日 {Math.round(score)}%</span>
                <span className={styles.points}>{points}</span>
                <span className={styles.bar}>
                  <span className={`${styles.fill} ${styles[`fill_${key}`]}`} style={{ width: `${(points / MAX_POINTS) * 100}%` }} />
                </span>
              </div>
            )
          })}
          <p className={styles.total}>
            総合 <strong>{character.points.total}</strong> / {MAX_POINTS} P
            <span className={styles.totalToday}>（今日の達成度 {today.total_percent}%）</span>
          </p>
        </section>

        {notice && <p className={styles.notice}>{notice}</p>}
        <ErrorList errors={errors} />

        <section className={styles.buttons} aria-label="記録">
          <Link to="/meals" className={`${styles.button} ${styles.meal}`}>
            <span className={styles.icon}>🍴</span>食事
          </Link>
          <TimerSlot
            active={Boolean(sleepTimer)}
            busy={busy}
            cancelLabel="睡眠の計測を取り消す"
            onCancel={() => act('sleep_records', 'cancel', '睡眠の計測を取り消しますか？（記録は残りません）')}
          >
            <button
              type="button"
              className={`${styles.button} ${sleepTimer ? styles.wake : styles.sleep}`}
              disabled={busy}
              onClick={() => act('sleep_records', sleepTimer ? 'finish' : 'start')}
            >
              <span className={styles.icon}>{sleepTimer ? '☀️' : '🛏️'}</span>
              <span className={styles.buttonText}>
                {sleepTimer ? '起床' : '就寝'}
                {sleepTimer && <small>{formatTime(sleepTimer.slept_at)} から</small>}
              </span>
            </button>
          </TimerSlot>
          <TimerSlot
            active={Boolean(workTimer)}
            busy={busy}
            cancelLabel="ワークの計測を取り消す"
            onCancel={() => act('work_records', 'cancel', 'ワークの計測を取り消しますか？（記録は残りません）')}
          >
            <button
              type="button"
              className={`${styles.button} ${styles.work} ${workTimer ? styles.working : ''}`}
              disabled={busy || (sleeping && !workTimer)}
              onClick={() => act('work_records', workTimer ? 'finish' : 'start')}
              title={sleeping ? '睡眠中はワークを開始できません' : undefined}
            >
              <span className={styles.icon}>📖</span>
              <span className={styles.buttonText}>
                <span>
                  ワーク
                  <wbr />
                  {workTimer ? '終了' : '開始'}
                </span>
                {workTimer && <small>{formatElapsed(now - new Date(workTimer.started_at).getTime())}</small>}
              </span>
            </button>
          </TimerSlot>
          <Link to="/exercise" className={`${styles.button} ${styles.exercise}`}>
            <span className={styles.icon}>🏃</span>運動
          </Link>
          <button type="button" className={`${styles.button} ${styles.bath}`} disabled>
            <span className={styles.icon}>🛁</span>
            <span className={styles.buttonText}>
              入浴<small>準備中</small>
            </span>
          </button>
          <button type="button" className={`${styles.button} ${styles.hobby}`} disabled>
            <span className={styles.icon}>🎵</span>
            <span className={styles.buttonText}>
              趣味<small>準備中</small>
            </span>
          </button>
        </section>

      </div>
    </AppShell>
  )
}

// 睡眠・ワークのボタン。計測中はボタンの右上に小さな「取消」を重ねる（行を増やさないため）
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
