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
            <Link to="/exercise" className={`${styles.button} ${styles.exercise}`}>
              <ExerciseIcon className={styles.buttonIcon} />
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
                {sleepTimer ? <SunIcon className={styles.buttonIcon} /> : <SleepIcon className={styles.buttonIcon} />}
                <span className={styles.timerText}>{sleepTimer ? '起床' : '睡眠'}</span>
                {sleepTimer && <small className={styles.since}>{formatTime(sleepTimer.slept_at)}〜</small>}
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
