// 目標の入力を「睡眠・運動・ワーク」と「食事」のタブに分ける（スマホでスクロールを減らすため）。目標変更・目標設定で使う。
// 新規登録は③④が最初から別の画面なので使わない
import { validateBasics } from './goalDraft.js'
import goal from './GoalForm.module.css'

const TABS = [
  { key: 'basics', label: '睡眠・運動・ワーク' },
  { key: 'meals', label: '食事' },
]

export default function GoalTabs({ current, onChange }) {
  return (
    <div className={goal.tabs} role="tablist" aria-label="目標の項目">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={key === current}
          className={`${goal.tab} ${key === current ? goal.tabActive : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// 入力のエラーがあるタブ（保存できなかったときに、直す項目のあるタブを開くため）
export function tabWithErrors(draft) {
  return validateBasics(draft).length ? 'basics' : 'meals'
}
