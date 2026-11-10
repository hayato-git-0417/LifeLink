// ホームの進化カード（spec.md 4.3）。GET /api/v1/home の evolution を表示する。
// 1行目: 累計ポイントと段階（進化N）／ゲージ: 今の段階のラインから次の段階のラインまでの進み具合／
// 下: 次の進化までのポイント、今日記録したときの倍率、今日記録した項目（1項目1日1回ポイントが入るので、残りが分かるように）
import { ExerciseIcon, MealIcon, SleepIcon, SparkleIcon, WorkIcon } from '../../components/icons.jsx'
import styles from './EvolutionCard.module.css'

// 記録ボタンと同じ並び
const ITEMS = [
  { key: 'meal', label: '食事', Icon: MealIcon },
  { key: 'work', label: 'ワーク', Icon: WorkIcon },
  { key: 'exercise', label: '運動', Icon: ExerciseIcon },
  { key: 'sleep', label: '睡眠', Icon: SleepIcon },
]

// 倍率は 10 分の 1 単位の整数で届く（14 → "1.4"、100 → "10"）
function formatMultiplier(tenths) {
  return tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`
}

function formatPoints(points) {
  return points.toLocaleString('ja-JP')
}

export default function EvolutionCard({ evolution }) {
  const { stage, points, next_stage_points: nextStagePoints, points_to_next: pointsToNext, progress_percent: percent } = evolution
  const finalStage = nextStagePoints === null
  const recorded = new Set(evolution.recorded_items_today)
  const recordedLabels = ITEMS.filter(({ key }) => recorded.has(key)).map(({ label }) => label)

  return (
    <section className={styles.card} aria-label="キャラの進化">
      <div className={styles.head}>
        <span className={styles.label}>累計ポイント</span>
        <span className={styles.points}>
          <strong>{formatPoints(points)}</strong>
          <small>pt</small>
        </span>
        <span className={styles.stage}>
          <SparkleIcon size={13} strokeWidth={2.4} />
          進化{stage}
        </span>
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
          role="img"
          aria-label={recordedLabels.length ? `今日記録した項目: ${recordedLabels.join('・')}` : '今日はまだ記録していません'}
        >
          {ITEMS.map(({ key, label, Icon }) => (
            <span key={key} className={`${styles.item} ${recorded.has(key) ? styles[`done_${key}`] : ''}`} title={label}>
              <Icon size={13} strokeWidth={2.2} />
            </span>
          ))}
        </span>
      </div>
    </section>
  )
}
