// 目標設定: 睡眠（時間帯／時間の切り替え）・運動タスク（追加・削除）・ワーク時間（デザイン p.11 / p.12）
// 新規登録③・目標設定・目標変更で使う。value は goalDraft.js の形、onChange には変更する項目だけ渡す
import IconBadge from '../components/IconBadge.jsx'
import { CloseIcon, ExerciseIcon, PlusIcon, SleepIcon, WorkIcon } from '../components/icons.jsx'
import styles from '../styles/form.module.css'
import goal from './GoalForm.module.css'

const MAX_TASKS = 10
const SLEEP_TYPES = [
  { key: 'time_range', label: '時間帯' },
  { key: 'duration', label: '時間' },
]

function HoursMinutes({ hours, minutes, onChange, label }) {
  return (
    <div className={goal.hoursMinutes} role="group" aria-label={label}>
      <input
        className={`${styles.input} ${styles.small}`}
        type="number"
        inputMode="numeric"
        min="0"
        max="24"
        value={hours}
        onChange={(event) => onChange({ hours: event.target.value })}
        aria-label={`${label}（時間）`}
      />
      <span>時間</span>
      <input
        className={`${styles.input} ${styles.small}`}
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        step="5"
        value={minutes}
        onChange={(event) => onChange({ minutes: event.target.value })}
        aria-label={`${label}（分）`}
      />
      <span>分</span>
    </div>
  )
}

export default function GoalBasicsForm({ value, onChange }) {
  const updateTask = (index, title) =>
    onChange({ tasks: value.tasks.map((task, i) => (i === index ? { ...task, title } : task)) })
  const removeTask = (index) => onChange({ tasks: value.tasks.filter((_, i) => i !== index) })
  const addTask = () => onChange({ tasks: [...value.tasks, { id: null, title: '' }] })

  return (
    <div className={goal.sections}>
      <section className={styles.card}>
        <div className={styles.panelHead}>
          <IconBadge tone="sleep">
            <SleepIcon size={20} />
          </IconBadge>
          <h2>睡眠</h2>
          <div className={`${styles.segmented} ${goal.switch}`} role="radiogroup" aria-label="睡眠の目標の決め方">
            {SLEEP_TYPES.map(({ key, label }) => (
              <label
                key={key}
                className={`${styles.segment} ${goal.switchItem} ${value.sleep_goal_type === key ? styles.segmentActive : ''}`}
              >
                <input
                  type="radio"
                  name="sleep_goal_type"
                  checked={value.sleep_goal_type === key}
                  onChange={() => onChange({ sleep_goal_type: key })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        {value.sleep_goal_type === 'duration' ? (
          <HoursMinutes
            label="睡眠時間"
            hours={value.sleep_hours}
            minutes={value.sleep_minutes}
            onChange={({ hours, minutes }) =>
              onChange({
                ...(hours !== undefined && { sleep_hours: hours }),
                ...(minutes !== undefined && { sleep_minutes: minutes }),
              })
            }
          />
        ) : (
          <>
            <div className={goal.hoursMinutes}>
              <input
                className={`${styles.input} ${styles.time}`}
                type="time"
                value={value.bedtime}
                onChange={(event) => onChange({ bedtime: event.target.value })}
                aria-label="就寝時刻"
              />
              <span>〜</span>
              <input
                className={`${styles.input} ${styles.time}`}
                type="time"
                value={value.wake_time}
                onChange={(event) => onChange({ wake_time: event.target.value })}
                aria-label="起床時刻"
              />
            </div>
            <p className={`${styles.hint} ${goal.below}`}>就寝時刻の30分前になると、キャラが声をかけます。</p>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.panelHead}>
          <IconBadge tone="exercise">
            <ExerciseIcon size={20} />
          </IconBadge>
          <h2>運動</h2>
          <span className={goal.count}>
            {value.tasks.length} / {MAX_TASKS}
          </span>
        </div>
        <ul className={goal.tasks}>
          {value.tasks.map((task, index) => (
            // 並べ替えはしないので、行の番号を key にする
            <li key={index} className={goal.task}>
              <span className={goal.taskDot} aria-hidden="true" />
              <input
                className={`${styles.input} ${goal.taskInput}`}
                type="text"
                maxLength={100}
                placeholder="例: 1キロ走る"
                value={task.title}
                onChange={(event) => updateTask(index, event.target.value)}
                aria-label={`運動の項目${index + 1}`}
                id={`task-${index}`}
              />
              {value.tasks.length > 1 && (
                <button
                  type="button"
                  className={goal.remove}
                  onClick={() => removeTask(index)}
                  aria-label={`項目${index + 1}を削除`}
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {value.tasks.length < MAX_TASKS && (
          <button type="button" className={goal.add} onClick={addTask}>
            <PlusIcon size={18} />
            項目を追加
          </button>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.panelHead}>
          <IconBadge tone="work">
            <WorkIcon size={20} />
          </IconBadge>
          <h2>ワーク時間（1日）</h2>
        </div>
        <HoursMinutes
          label="ワーク時間"
          hours={value.work_hours}
          minutes={value.work_minutes}
          onChange={({ hours, minutes }) =>
            onChange({
              ...(hours !== undefined && { work_hours: hours }),
              ...(minutes !== undefined && { work_minutes: minutes }),
            })
          }
        />
      </section>
    </div>
  )
}
