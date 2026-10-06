// 新規登録の進み具合（1〜4 の丸。済んだ・今のステップは緑。デザイン p.9〜p.12）
import styles from './Signup.module.css'

export default function StepIndicator({ current, total = 4 }) {
  return (
    <ol className={styles.steps} aria-label={`ステップ ${current} / ${total}`}>
      {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
        <li
          key={step}
          className={`${styles.step} ${step <= current ? styles.stepDone : ''}`}
          aria-current={step === current ? 'step' : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  )
}
