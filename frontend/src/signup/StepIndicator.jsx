// 新規登録の進み具合（デザイン p.9〜p.12）。済んだステップは若葉色のチェック、今のステップはココアで塗る
import { CheckIcon } from '../components/icons.jsx'
import styles from './Signup.module.css'

const LABELS = ['メール', 'プロフィール', '目標', '食事']

export default function StepIndicator({ current }) {
  return (
    <ol className={styles.steps} aria-label={`ステップ ${current} / ${LABELS.length}`}>
      {LABELS.map((label, index) => {
        const step = index + 1
        const state = step < current ? styles.done : step === current ? styles.current : ''
        return (
          <li key={step} className={`${styles.step} ${state}`} aria-current={step === current ? 'step' : undefined}>
            <span className={styles.dot}>{step < current ? <CheckIcon size={16} strokeWidth={3.4} /> : step}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
