// キャラの状態のマーク（ホームのキャラの右上に重ねる）。
// 進化の段階の絵は状態を表していない（卵のまま空腹など）ので、通常以外の状態のときに アイコン＋状態名 を出す。
// 状態ごとの段階の絵（public/characters/stages/<段階>_<状態>.png）を置くと API の image_shows_state が true になり、出さなくなる
import { ExerciseIcon, MealIcon, MoonIcon, SleepIcon, WorkIcon } from '../../components/icons.jsx'
import styles from './StateBadge.module.css'

// 状態 → アイコンと色（その状態に関わる項目の色）
const MARKS = {
  sleeping: { Icon: MoonIcon, tone: 'sleep' },
  sleep_deprived: { Icon: SleepIcon, tone: 'sleep' },
  full: { Icon: MealIcon, tone: 'meal' },
  hungry: { Icon: MealIcon, tone: 'meal' },
  exercising: { Icon: ExerciseIcon, tone: 'exercise' },
  studying: { Icon: WorkIcon, tone: 'work' },
  fat: { Icon: ExerciseIcon, tone: 'exercise' },
}

export default function StateBadge({ state, label }) {
  const mark = MARKS[state]
  if (!mark) return null // 通常（normal）は出さない

  return (
    // キャラの画像の alt に状態名が入っているので、読み上げは画像に任せる
    <span className={`${styles.badge} ${styles[mark.tone]}`} aria-hidden="true">
      <mark.Icon size={15} strokeWidth={2.2} />
      {label}
    </span>
  )
}
