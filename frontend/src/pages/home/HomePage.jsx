// ホーム（spec.md 3.4・4章）。GET /api/v1/home を表示する。
// レイアウト: 部屋の背景を画面いっぱいに出し、左上にユーザー（押すとマイページ）、右上に通知ベル、
// その下に「生活リズム」カード（今日の達成度）、中央にキャラ、下に記録ボタン4つ（食事・ワーク・運動・睡眠）。
// 上部ヘッダーは出さない。下部ナビ（ホーム／マイページ）はほかの画面と同じく出す。
// 睡眠・ワークは画面遷移せず、その場で start / finish を呼ぶ。計測中は「取消」も出す。
// 押したあとはホームを読み直すので、キャラの状態がすぐ変わる。
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import UserIcon from '../../components/UserIcon.jsx'
import { formatElapsed, formatMinutes, formatTime } from '../../lib/format.js'
import styles from './HomePage.module.css'

// 生活リズムカードの並び（デザインの順）
const ITEMS = [
  { key: 'meal', label: '食事' },
  { key: 'work', label: 'ワーク' },
  { key: 'exercise', label: '運動' },
  { key: 'sleep', label: '睡眠' },
]

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
  const { user, unreadCount, setUnreadCount } = useAuth()
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

  const sleeping = home?.character.state === 'sleeping'

  return (
    <AppShell noHeader>
      <div className={`${styles.room} ${sleeping ? styles.night : ''}`}>
        <header className={styles.top}>
          <Link to="/mypage" className={styles.userCard} aria-label="マイページ">
            <UserIcon icon={user?.icon} size={44} />
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.streak}>
              <span>継続日数</span>
              {/* 継続日数を返す API はまだないので仮表示（decisions.md） */}
              <span>〇日🔥</span>
            </span>
          </Link>
          <Link to="/notifications" className={styles.bell} aria-label={`通知（未読 ${unreadCount} 件）`}>
            <BellIcon />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
        </header>

        {home && (
          <section className={styles.rhythm} aria-label="今日の生活リズム">
            <p className={styles.rhythmTitle}>
              生活リズム <strong>{Math.round(home.today.total_percent)}%</strong>
            </p>
            {ITEMS.map(({ key, label }) => {
              const score = Math.round(home.today.scores[key])
              return (
                <div key={key} className={styles.row}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.bar}>
                    {/* ワークは 100% を超えることがあるので、ゲージは 100 で頭打ち */}
                    <span className={`${styles.fill} ${styles[`fill_${key}`]}`} style={{ width: `${Math.min(score, 100)}%` }} />
                  </span>
                  <span className={styles.percent}>{score}%</span>
                </div>
              )
            })}
          </section>
        )}

        <div className={styles.messages}>
          {!home && !errors.length && <p className={styles.loading}>読み込み中…</p>}
          {notice && <p className={styles.notice}>{notice}</p>}
          <ErrorList errors={errors} />
        </div>

        <section className={styles.stage}>
          {home && (
            <>
              {home.message && <p className={styles.bubble}>{home.message}</p>}
              <img
                className={`${styles.character} ${styles[`anim_${home.character.state}`] || styles.anim_normal}`}
                src={home.character.image_path}
                alt={`${home.character.name}（${home.character.state_label}）`}
              />
            </>
          )}
        </section>

        {home && (
          <nav className={styles.buttons} aria-label="記録">
            <Link to="/meals" className={`${styles.button} ${styles.meal}`}>
              <MealIcon />
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
                <WorkIcon />
                <span className={styles.timerText}>
                  {workTimer ? formatElapsed(now - new Date(workTimer.started_at).getTime()) : 'ワーク'}
                </span>
              </button>
            </TimerSlot>
            <Link to="/exercise" className={`${styles.button} ${styles.exercise}`}>
              <ExerciseIcon />
              <span>運動</span>
            </Link>
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
                <SleepIcon />
                <span className={styles.timerText}>{sleepTimer ? `${formatTime(sleepTimer.slept_at)}〜` : '睡眠'}</span>
              </button>
            </TimerSlot>
          </nav>
        )}
      </div>
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
      />
    </svg>
  )
}

// 記録ボタンのアイコン（デザインの線画に合わせた SVG）
function MealIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.buttonIcon} aria-hidden="true">
      <path fill="currentColor" d="M7 3h2v8h1.5V3h2v8H14V3h2v9a4 4 0 0 1-3 3.87V29h-3V15.87A4 4 0 0 1 7 12V3Z" />
      <path fill="currentColor" d="M22 3c3 0 4 4 4 8s-1.5 5-3 5.5V29h-3V3h2Z" />
    </svg>
  )
}

function WorkIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.buttonIcon} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M3 8c4-1.5 8-1.5 12 1v17c-4-2.5-8-2.5-12-1V8Zm12 1c3-1.8 6-2.3 9-1.6M15 26c3-1.8 6-2.3 9-1.6V20"
      />
      <path fill="currentColor" d="m26.5 6 2.5 2.5-9 9-3.5 1 1-3.5 9-9Z" />
    </svg>
  )
}

function ExerciseIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.buttonIcon} aria-hidden="true">
      <rect x="3" y="11" width="4" height="10" rx="1.2" fill="currentColor" />
      <rect x="7.5" y="8" width="4" height="16" rx="1.2" fill="currentColor" />
      <rect x="11.5" y="14.5" width="9" height="3" fill="currentColor" />
      <rect x="20.5" y="8" width="4" height="16" rx="1.2" fill="currentColor" />
      <rect x="25" y="11" width="4" height="10" rx="1.2" fill="currentColor" />
    </svg>
  )
}

function SleepIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.buttonIcon} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M3 6v21M3 21h26v6M3 16h26v5M11 16v-3a2 2 0 0 1 2-2h12a4 4 0 0 1 4 4v1"
      />
      <rect x="5" y="12" width="5" height="4" rx="1.5" fill="currentColor" />
    </svg>
  )
}
