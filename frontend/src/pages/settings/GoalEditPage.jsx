// 目標変更（デザイン p.17）。新規登録③④と同じ部品（睡眠・運動タスク・ワーク・食事の目標・食事時刻）。
// スマホでスクロールしないように「睡眠・運動・ワーク / 食事」のタブで切り替える（保存は両方まとめて）。
// 今の目標（GET /goal）を入れた状態から始める。栄養目標は「年齢・性別から出し直す」を押したときだけ初期値で上書きする
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import GoalTabs, { tabWithErrors } from '../../goal/GoalTabs.jsx'
import GoalBasicsForm from '../../goal/GoalBasicsForm.jsx'
import { applyNutritionDefaults, goalDraftFromApi, toGoalPayload, validateBasics, validateMeals } from '../../goal/goalDraft.js'
import MealGoalForm from '../../goal/MealGoalForm.jsx'
import form from '../../styles/form.module.css'

export default function GoalEditPage() {
  const navigate = useNavigate()
  const [goal, setGoal] = useState(null)
  const [basis, setBasis] = useState(null)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('basics')

  useEffect(() => {
    let active = true
    api('/goal')
      .then(async (data) => {
        if (!active) return
        setGoal(goalDraftFromApi(data.goal, data.exercise_tasks))
        const defaults = await api('/goal/nutrition_defaults')
        if (active) setBasis(defaults.nutrition_defaults.basis)
      })
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [])

  const updateGoal = (changes) => setGoal((current) => ({ ...current, ...changes }))

  async function resetDefaults() {
    setBusy(true)
    try {
      const data = await api('/goal/nutrition_defaults')
      setBasis(data.nutrition_defaults.basis)
      setGoal((current) => applyNutritionDefaults(current, data.nutrition_defaults))
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = [...validateBasics(goal), ...validateMeals(goal)]
    if (found.length) {
      setErrors(found)
      setTab(tabWithErrors(goal))
      window.scrollTo(0, 0)
      return
    }
    setBusy(true)
    setErrors([])
    try {
      await api('/goal', { method: 'PUT', body: toGoalPayload(goal) })
      navigate('/settings', { replace: true, state: { message: '目標を保存しました' } })
    } catch (error) {
      setErrors(error.messages)
      setBusy(false)
      window.scrollTo(0, 0)
    }
  }

  return (
    <AppShell title="目標変更" backTo="/settings">
      {!goal ? (
        <>
          <ErrorList errors={errors} />
          {!errors.length && <p className={form.loading}>読み込み中…</p>}
        </>
      ) : (
        <form className={form.form} onSubmit={handleSubmit} noValidate>
          <ErrorList errors={errors} />
          <p className={form.hint}>変えた目標は今日のスコアから使います。</p>
          <GoalTabs current={tab} onChange={setTab} />
          {tab === 'basics' ? (
            <GoalBasicsForm value={goal} onChange={updateGoal} />
          ) : (
            <MealGoalForm value={goal} onChange={updateGoal} basis={basis} onResetDefaults={resetDefaults} loadingDefaults={busy} />
          )}
          <div className={`${form.actions} ${form.actionsCenter}`}>
            <button className={`${form.button} ${form.primary}`} type="submit" disabled={busy}>
              {busy ? '保存中…' : '設定を保存する'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
