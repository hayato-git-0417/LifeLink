// 進化のテストパネル（開発用）。npm run dev のときだけ HomePage が読み込む（本番のビルドには入らない）。
// ホーム右上の「テスト」で開き、/api/v1/dev/evolution（development の Rails だけにある）を呼ぶ。
// 操作のたびにホームを読み直すので、キャラの姿・進化カード・通知の数がその場で変わる。
// 記録そのもの（食事など）は作らず、進化のポイント・継続日数・休んだ日だけを本物の処理で動かす（app/services/evolution_sandbox.rb）
import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import ErrorList from '../../components/ErrorList.jsx'
import { CloseIcon, SparkleIcon } from '../../components/icons.jsx'
import styles from './EvolutionDevPanel.module.css'
import { formatChange, formatMultiplier, formatPoints } from './evolutionFormat.js'

const PATH = '/dev/evolution'
const ITEMS = [
  { key: 'meal', label: '食事' },
  { key: 'work', label: 'ワーク' },
  { key: 'exercise', label: '運動' },
  { key: 'sleep', label: '睡眠' },
]
const ITEM_LABELS = Object.fromEntries(ITEMS.map(({ key, label }) => [key, label]))
const ADVANCE_DAYS = [1, 2, 3, 7, 30]
const SIMULATE_DAYS = [1, 7, 30, 90, 300]
const DAY_MS = 24 * 60 * 60 * 1000

// "2026-11-08"（今日が 11/10）→ "2日前"
function daysAgo(today, date) {
  if (!date) return 'なし'
  const diff = Math.round((Date.parse(today) - Date.parse(date)) / DAY_MS)
  if (diff === 0) return '今日'
  if (diff === 1) return '昨日'
  return diff > 0 ? `${diff}日前` : `${-diff}日後`
}

// "2026-11-08" → "11/8"
function shortDate(date) {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

// 操作の結果を1行の文にする
function describe(result) {
  if (!result) return ''
  const { action, log } = result
  switch (action) {
    case 'record':
      return log
        ? `${ITEM_LABELS[result.item]}を記録: ${formatChange(log.amount)}pt（×${formatMultiplier(log.multiplier_tenths)}）`
        : `${ITEM_LABELS[result.item]}は今日もう記録済みです（ポイントは1項目1日1回）`
    case 'advance':
      return log
        ? `${result.days}日進めました: 休んだ日 ${log.missed_days}日 → ${formatChange(log.amount)}pt・継続日数は 0 に`
        : `${result.days}日進めました: 休んだ日はありません`
    case 'simulate':
      return `${result.days}日間 毎日${result.items}項目を記録: ${formatChange(result.after.points - result.before.points)}pt（進化${result.before.stage} → 進化${result.after.stage}）`
    case 'set_points':
      return `累計ポイントを ${formatPoints(result.points)}pt にしました`
    case 'set_streak':
      return `継続日数を ${result.streak_days}日（昨日まで）にしました`
    case 'reset':
      return '最初の状態（0pt・進化0）に戻しました'
    default:
      return ''
  }
}

// 増減の履歴1行
function logText(log) {
  if (log.reason === 'missed') return `休み${log.missed_days}日`
  return `${ITEM_LABELS[log.item]} ×${formatMultiplier(log.multiplier_tenths)}`
}

export default function EvolutionDevPanel({ onChanged }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(null)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState(4)
  const [points, setPoints] = useState('')
  const [streak, setStreak] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let active = true
    api(PATH)
      .then((data) => active && setState(data))
      .catch((error) => active && setErrors(error.messages || [String(error)]))
    return () => {
      active = false
    }
  }, [open])

  async function run(path, options = {}, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    setBusy(true)
    setErrors([])
    setMessage(options.method === 'POST' && path.endsWith('simulate') ? '計算中…（日数が多いと数秒かかります）' : '')
    try {
      const data = await api(path, options)
      setState(data)
      setMessage(describe(data.result))
      await onChanged()
    } catch (error) {
      setMessage('')
      setErrors(error.messages || [String(error)])
    } finally {
      setBusy(false)
    }
  }

  function submitNumber(event, key, value) {
    event.preventDefault()
    if (value === '') return
    run(PATH, { method: 'PATCH', body: { [key]: Number(value) } })
  }

  const evolution = state?.evolution
  const recorded = new Set(evolution?.recorded_items_today)

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="evolution-dev-panel"
      >
        <SparkleIcon size={16} strokeWidth={2.4} />
        テスト
      </button>

      {open && (
        <section id="evolution-dev-panel" className={styles.sheet} aria-label="進化のテスト（開発用）">
          <header className={styles.head}>
            <h2 className={styles.title}>
              進化のテスト <small>開発用・本番には出ません</small>
            </h2>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="閉じる">
              <CloseIcon size={18} />
            </button>
          </header>

          {!state ? (
            !errors.length && <p className={styles.hint}>読み込み中…</p>
          ) : (
            <>
              <div className={styles.status}>
                <img key={state.image_path} className={styles.preview} src={state.image_path} alt={`進化${evolution.stage}の姿`} />
                <dl className={styles.facts}>
                  <div>
                    <dt>段階</dt>
                    <dd>進化{evolution.stage}</dd>
                  </div>
                  <div>
                    <dt>累計</dt>
                    <dd>{formatPoints(evolution.points)}pt</dd>
                  </div>
                  <div>
                    <dt>次の進化まで</dt>
                    <dd>{evolution.next_stage_points === null ? '最終' : `${formatPoints(evolution.points_to_next)}pt`}</dd>
                  </div>
                  <div>
                    <dt>継続日数</dt>
                    <dd>{evolution.streak_days}日</dd>
                  </div>
                  <div>
                    <dt>今日の倍率</dt>
                    <dd>×{formatMultiplier(evolution.multiplier_tenths)}</dd>
                  </div>
                  <div>
                    <dt>最後の記録</dt>
                    <dd>{daysAgo(state.today, state.last_recorded_on)}</dd>
                  </div>
                </dl>
              </div>

              <p className={styles.message} aria-live="polite">
                {message || '下のボタンで試すと、ホームのキャラと進化カードも変わります'}
              </p>
              <ErrorList errors={errors} />

              <section className={styles.group}>
                <h3>今日の記録（1項目1日1回）</h3>
                <div className={styles.row}>
                  {ITEMS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.chip} ${recorded.has(key) ? styles.done : ''}`}
                      disabled={busy}
                      onClick={() => run(`${PATH}/record`, { method: 'POST', body: { item: key } })}
                    >
                      {recorded.has(key) ? `${label} ✓` : label}
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.group}>
                <h3>日を進める（その間は記録なし）</h3>
                <div className={styles.row}>
                  {ADVANCE_DAYS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={styles.chip}
                      disabled={busy}
                      onClick={() => run(`${PATH}/advance`, { method: 'POST', body: { days } })}
                    >
                      {days === 1 ? '翌日へ' : `${days}日後へ`}
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>今日まだ記録していなければ、今日も休んだ日に数えます（1日 −200）。</p>
              </section>

              <section className={styles.group}>
                <h3>毎日記録して進める</h3>
                <div className={styles.row}>
                  <span className={styles.inlineLabel}>1日に</span>
                  <span className={styles.segmented} role="group" aria-label="1日に記録する項目の数">
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`${styles.segment} ${items === count ? styles.segmentActive : ''}`}
                        aria-pressed={items === count}
                        onClick={() => setItems(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </span>
                  <span className={styles.inlineLabel}>項目</span>
                </div>
                <div className={styles.row}>
                  {SIMULATE_DAYS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={styles.chip}
                      disabled={busy}
                      onClick={() => run(`${PATH}/simulate`, { method: 'POST', body: { days, items } })}
                    >
                      {days}日
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>今日から毎日記録して、最後の日の翌日にします。4項目なら 300日で最終段階に届きます。</p>
              </section>

              <section className={styles.group}>
                <h3>段階を選ぶ（その段階のラインのポイントにする）</h3>
                <ol className={styles.stages}>
                  {state.stages.map((stage) => (
                    <li key={stage.stage}>
                      <button
                        type="button"
                        className={`${styles.stage} ${stage.stage === evolution.stage ? styles.current : ''}`}
                        disabled={busy}
                        aria-current={stage.stage === evolution.stage ? 'true' : undefined}
                        onClick={() => run(PATH, { method: 'PATCH', body: { points: stage.points } })}
                      >
                        <img src={stage.image_path || '/characters/normal.png'} alt="" />
                        <span>進化{stage.stage}</span>
                        <small>{formatPoints(stage.points)}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={styles.group}>
                <h3>直接決める</h3>
                <form className={styles.row} onSubmit={(event) => submitNumber(event, 'points', points)}>
                  <label className={styles.inlineLabel} htmlFor="dev-points">累計</label>
                  <input
                    id="dev-points"
                    className={styles.input}
                    type="number"
                    min="0"
                    max="10000000"
                    inputMode="numeric"
                    value={points}
                    onChange={(event) => setPoints(event.target.value)}
                    placeholder={String(evolution.points)}
                  />
                  <span className={styles.inlineLabel}>pt</span>
                  <button type="submit" className={styles.chip} disabled={busy || points === ''}>
                    決める
                  </button>
                </form>
                <form className={styles.row} onSubmit={(event) => submitNumber(event, 'streak_days', streak)}>
                  <label className={styles.inlineLabel} htmlFor="dev-streak">継続</label>
                  <input
                    id="dev-streak"
                    className={styles.input}
                    type="number"
                    min="0"
                    max="1000"
                    inputMode="numeric"
                    value={streak}
                    onChange={(event) => setStreak(event.target.value)}
                    placeholder={String(evolution.streak_days)}
                  />
                  <span className={styles.inlineLabel}>日</span>
                  <button type="submit" className={styles.chip} disabled={busy || streak === ''}>
                    決める
                  </button>
                </form>
                <p className={styles.hint}>継続は「昨日まで続いている」ことにします（89日にして記録すると 10倍）。直接決めたときは履歴・通知を作りません。</p>
              </section>

              <section className={styles.group}>
                <h3>最近の増減</h3>
                {state.logs.length === 0 ? (
                  <p className={styles.hint}>まだありません</p>
                ) : (
                  <ol className={styles.logs}>
                    {state.logs.map((log) => (
                      <li key={log.id}>
                        <span className={styles.logDate}>{shortDate(log.target_date)}</span>
                        <span className={styles.logWhat}>{logText(log)}</span>
                        <span className={log.amount < 0 ? styles.minus : styles.plus}>{formatChange(log.amount)}</span>
                        <span className={styles.logAfter}>
                          {formatPoints(log.points_after)}pt・進化{log.stage_after}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <button
                type="button"
                className={`${styles.chip} ${styles.reset}`}
                disabled={busy}
                onClick={() => run(PATH, { method: 'DELETE' }, '進化を最初の状態（0pt・進化0）に戻しますか？（進化の履歴と通知も消えます）')}
              >
                リセット（0pt・進化0 に戻す）
              </button>
            </>
          )}
        </section>
      )}
    </>
  )
}
