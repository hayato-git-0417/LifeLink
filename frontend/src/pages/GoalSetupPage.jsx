// 目標設定（目標が未登録のユーザー向け。spec.md 5章）。新規登録③④と同じ部品を使う。
// 新規登録で目標の保存だけ失敗したときは、入力していた値（location.state.draft）から続ける。
// 目標変更と同じく「睡眠・運動・ワーク / 食事」のタブで切り替える（保存は両方まとめて）。
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import AppShell from '../components/AppShell.jsx'
import ErrorList from '../components/ErrorList.jsx'
import GoalTabs, { tabWithErrors } from '../goal/GoalTabs.jsx'
import GoalBasicsForm from '../goal/GoalBasicsForm.jsx'
import { applyNutritionDefaults, newGoalDraft, toGoalPayload, validateBasics, validateMeals } from '../goal/goalDraft.js'
import MealGoalForm from '../goal/MealGoalForm.jsx'
import styles from '../styles/form.module.css'

export default function GoalSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshMe } = useAuth()
  const [goal, setGoal] = useState(() => location.state?.draft || newGoalDraft())
  const [errors, setErrors] = useState(() => location.state?.errors || [])
  const [basis, setBasis] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('basics')

  const updateGoal = (changes) => setGoal((current) => ({ ...current, ...changes }))

  // 自分の生年月日・性別から栄養目標の初期値を出す（入力済みの値があれば上書きしない）
  async function loadDefaults(overwrite) {
    setBusy(true)
    try {
      const data = await api('/goal/nutrition_defaults')
      setBasis(data.nutrition_defaults.basis)
      if (overwrite) setGoal((current) => applyNutritionDefaults(current, data.nutrition_defaults))
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadDefaults(!location.state?.draft)
    // 最初の1回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      await refreshMe()
      navigate('/', { replace: true })
    } catch (error) {
      setErrors(error.messages)
      setBusy(false)
      window.scrollTo(0, 0)
    }
  }

  return (
    <AppShell title="目標設定">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.hint}>はじめに理想の生活リズムを登録してください。キャラはこの目標に沿って暮らします。</p>
        <ErrorList errors={errors} />
        <GoalTabs current={tab} onChange={setTab} />
        {tab === 'basics' ? (
          <GoalBasicsForm value={goal} onChange={updateGoal} />
        ) : (
          <MealGoalForm
            value={goal}
            onChange={updateGoal}
            basis={basis}
            onResetDefaults={() => loadDefaults(true)}
            loadingDefaults={busy}
          />
        )}
        <div className={`${styles.actions} ${styles.actionsCenter}`}>
          <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={busy}>
            {busy ? '保存中…' : '保存してはじめる'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
