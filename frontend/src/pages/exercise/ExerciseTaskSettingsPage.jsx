import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import { CloseIcon, ExerciseIcon, PlusIcon } from '../../components/icons.jsx'
import form from '../../styles/form.module.css'
import goalStyles from '../../goal/GoalForm.module.css'

const MAX_TASKS = 10

export default function ExerciseTaskSettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/exercise'
  const [goal, setGoal] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    api('/goal')
      .then((data) => {
        if (!active) return
        setGoal(data.goal)
        setTasks(data.exercise_tasks.map((task) => ({ id: task.id, title: task.title })))
      })
      .catch((error) => active && setErrors(error.messages))
    return () => { active = false }
  }, [])

  function updateTask(index, title) {
    setTasks((current) => current.map((task, taskIndex) => (taskIndex === index ? { ...task, title } : task)))
  }

  function addTask() {
    setTasks((current) => [...current, { id: null, title: '' }])
  }

  function removeTask(index) {
    setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const exerciseTasks = tasks
      .map((task) => ({ ...task, title: task.title.trim() }))
      .filter((task) => task.title)

    if (!exerciseTasks.length) {
      setErrors(['運動項目を1件以上入力してください'])
      return
    }

    setBusy(true)
    setErrors([])
    try {
      await api('/goal', {
        method: 'PUT',
        body: {
          goal,
          exercise_tasks: exerciseTasks.map((task) => (task.id ? { id: task.id, title: task.title } : { title: task.title })),
        },
      })
      navigate(returnTo, { replace: true })
    } catch (error) {
      setErrors(error.messages)
      setBusy(false)
      window.scrollTo(0, 0)
    }
  }

  return (
    <AppShell title="運動項目の変更" backTo={returnTo}>
      {!tasks ? (
        <>
          <ErrorList errors={errors} />
          {!errors.length && <p className={form.loading}>読み込み中…</p>}
        </>
      ) : (
        <form className={form.form} onSubmit={handleSubmit} noValidate>
          <ErrorList errors={errors} />
          <section className={form.card}>
            <div className={form.panelHead}>
              <IconBadge tone="exercise">
                <ExerciseIcon size={20} />
              </IconBadge>
              <h2>運動項目</h2>
              <span className={goalStyles.count}>{tasks.length} / {MAX_TASKS}</span>
            </div>
            <p className={form.hint}>運動タイマーに表示する項目を追加・変更できます。</p>
            <ul className={goalStyles.tasks}>
              {tasks.map((task, index) => (
                <li key={task.id || `new-${index}`} className={goalStyles.task}>
                  <span className={goalStyles.taskDot} aria-hidden="true" />
                  <input
                    className={`${form.input} ${goalStyles.taskInput}`}
                    type="text"
                    maxLength={100}
                    placeholder={index === 0 ? 'ランニング' : index === 1 ? '筋トレ' : '運動項目名'}
                    value={task.title}
                    onChange={(event) => updateTask(index, event.target.value)}
                    aria-label={`運動項目${index + 1}`}
                  />
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      className={goalStyles.remove}
                      onClick={() => removeTask(index)}
                      aria-label={`運動項目${index + 1}を削除`}
                    >
                      <CloseIcon size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {tasks.length < MAX_TASKS && (
              <button type="button" className={goalStyles.add} onClick={addTask}>
                <PlusIcon size={18} />
                項目を追加
              </button>
            )}
          </section>
          <button className={`${form.button} ${form.primary} ${form.block}`} type="submit" disabled={busy || !goal}>
            {busy ? '保存中…' : '運動項目を保存'}
          </button>
        </form>
      )}
    </AppShell>
  )
}
