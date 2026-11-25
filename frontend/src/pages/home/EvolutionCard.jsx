// ホームの進化カード（spec.md 4.3）。GET /api/v1/home の evolution を表示する。
// 1行目: 累計ポイントと段階（進化N）／ゲージ: 今の段階のラインから次の段階のラインまでの進み具合／
// 下: 次の進化までのポイント、今日記録したときの倍率、今日記録した項目（1項目1日1回ポイントが入るので、残りが分かるように）
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExerciseIcon, MealIcon, SleepIcon, SparkleIcon, WorkIcon } from '../../components/icons.jsx'
import styles from './EvolutionCard.module.css'
import { formatMultiplier, formatPoints } from './evolutionFormat.js'

// 記録ボタンと同じ並び
const ITEMS = [
  { key: 'meal', label: '食事', Icon: MealIcon },
  { key: 'work', label: 'ワーク', Icon: WorkIcon },
  { key: 'exercise', label: '運動', Icon: ExerciseIcon },
  { key: 'sleep', label: '睡眠', Icon: SleepIcon },
]

export default function EvolutionCard({ evolution }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const { stage, points, next_stage_points: nextStagePoints, points_to_next: pointsToNext, progress_percent: percent } = evolution
  const finalStage = nextStagePoints === null
  const recorded = new Set(evolution.recorded_items_today)
  const recordedLabels = ITEMS.filter(({ key }) => recorded.has(key)).map(({ label }) => label)
  const selected = ITEMS.find(({ key }) => key === selectedItem)

  return (
    <section className={styles.card} aria-label="キャラの進化">
      <div className={styles.head}>
        <Link to="/details" className={styles.pointsLink} aria-label="累計ポイントの詳細を見る">
          <span className={styles.label}>累計ポイント</span>
          <span className={styles.points}>
            <strong>{formatPoints(points)}</strong>
            <small>pt</small>
          </span>
          <span className={styles.stage}>
            <SparkleIcon size={13} strokeWidth={2.4} />
            進化{stage}
          </span>
        </Link>
      </div>

      <div
        className={styles.bar}
        role="progressbar"
        aria-label={finalStage ? '最終進化' : `進化${stage + 1}までの進み具合`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(percent)}
      >
        {percent > 0 && <span className={styles.fill} style={{ width: `${percent}%` }} />}
      </div>

      <p className={styles.next}>
        {finalStage ? (
          '最終進化！'
        ) : (
          <>
            次の進化まで <strong>{formatPoints(pointsToNext)}</strong> pt
          </>
        )}
      </p>

      <div className={styles.foot}>
        <span className={styles.multiplier}>
          今日の倍率 <strong>×{formatMultiplier(evolution.multiplier_tenths)}</strong>
        </span>
        <span
          className={styles.items}
          role="group"
          aria-label={recordedLabels.length ? `今日記録した項目: ${recordedLabels.join('・')}` : '今日の記録項目'}
        >
          {ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`${styles.item} ${recorded.has(key) ? styles[`done_${key}`] : ''}`}
              aria-pressed={selectedItem === key}
              aria-label={`${label}の記録状況を表示`}
              onClick={() => setSelectedItem(key)}
            >
              <Icon size={13} strokeWidth={2.2} />
            </button>
          ))}
        </span>
      </div>
      {selected && (
        <p className={styles.itemHint} role="status">
          {selected.label}の記録 {recorded.has(selected.key) ? '今日は記録済みです' : '今日はまだ記録していません'}
        </p>
      )}
    </section>
  )
}
