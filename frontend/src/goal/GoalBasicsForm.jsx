// 目標設定: 睡眠（時間／時間帯の切り替え）・運動タスク（追加・削除）・ワーク時間（デザイン p.11 / p.12）
// 新規登録③・目標設定・目標変更で使う。value は goalDraft.js の形、onChange には変更する項目だけ渡す
import styles from '../styles/form.module.css'
import goal from './GoalForm.module.css'

const MAX_TASKS = 10

function HoursMinutes({ hours, minutes, onChange, label }) {
  return (
    <div className={styles.row} role="group" aria-label={label}>
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
    <div className={styles.form}>
      <section className={goal.section}>
        <h3 className={styles.sectionTitle}>睡眠</h3>
        <div className={styles.radioGroup}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="sleep_goal_type"
              checked={value.sleep_goal_type === 'time_range'}
              onChange={() => onChange({ sleep_goal_type: 'time_range' })}
            />
            時間帯
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="sleep_goal_type"
              checked={value.sleep_goal_type === 'duration'}
              onChange={() => onChange({ sleep_goal_type: 'duration' })}
            />
            時間
          </label>
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
            <div className={styles.row}>
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
            <p className={styles.hint}>就寝時刻の30分前になると、キャラが声をかけます。</p>
          </>
        )}
      </section>

      <section className={goal.section}>
        <h3 className={styles.sectionTitle}>運動</h3>
        {value.tasks.map((task, index) => (
          // 並べ替えはしないので、行の番号を key にする
          <div key={index} className={goal.task}>
            <label className={goal.taskLabel} htmlFor={`task-${index}`}>
              項目{index + 1}
            </label>
            <div className={styles.row}>
              <input
                id={`task-${index}`}
                className={`${styles.input} ${goal.taskInput}`}
                type="text"
                maxLength={100}
                placeholder="例: 1キロ走る"
                value={task.title}
                onChange={(event) => updateTask(index, event.target.value)}
              />
              {value.tasks.length > 1 && (
                <button
                  type="button"
                  className={goal.remove}
                  onClick={() => removeTask(index)}
                  aria-label={`項目${index + 1}を削除`}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        {value.tasks.length < MAX_TASKS && (
          <button type="button" className={styles.linkButton} onClick={addTask}>
            ＋ 項目を追加
          </button>
        )}
      </section>

      <section className={goal.section}>
        <h3 className={styles.sectionTitle}>ワーク時間（1日）</h3>
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
