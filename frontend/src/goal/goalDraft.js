// 目標の入力中の値（新規登録③④・目標設定・目標変更で共通）と、PUT /goal に送る形への変換。
// 時間（分）は画面では「時間」と「分」に分けて入力する。

const NUTRIENT_KEYS = ['calorie_goal', 'protein_goal_g', 'fat_goal_g', 'carbs_goal_g', 'fiber_goal_g']
export const MEAL_TIME_KEYS = ['breakfast_time', 'lunch_time', 'dinner_time']

export const NUTRIENT_FIELDS = [
  { key: 'calorie_goal', label: 'カロリー', unit: 'kcal', step: 1 },
  { key: 'protein_goal_g', label: 'たんぱく質', unit: 'g', step: 0.1 },
  { key: 'fat_goal_g', label: '脂質', unit: 'g', step: 0.1 },
  { key: 'carbs_goal_g', label: '炭水化物', unit: 'g', step: 0.1 },
  { key: 'fiber_goal_g', label: '食物繊維', unit: 'g', step: 0.1 },
]

export const MEAL_TIME_FIELDS = [
  { key: 'breakfast_time', label: '朝食' },
  { key: 'lunch_time', label: '昼食' },
  { key: 'dinner_time', label: '夕食' },
]

export function newGoalDraft() {
  return {
    sleep_goal_type: 'duration',
    sleep_hours: '7',
    sleep_minutes: '0',
    bedtime: '00:00',
    wake_time: '07:00',
    work_hours: '7',
    work_minutes: '0',
    tasks: [
      { id: null, title: '' },
      { id: null, title: '' },
    ],
    calorie_goal: '',
    protein_goal_g: '',
    fat_goal_g: '',
    carbs_goal_g: '',
    fiber_goal_g: '',
    breakfast_time: '07:00',
    lunch_time: '12:00',
    dinner_time: '19:00',
  }
}

// GET /goal の値から入力中の値を作る（目標変更。フェーズ7）
export function goalDraftFromApi(goal, tasks) {
  const draft = newGoalDraft()
  if (!goal) return draft
  const sleep = goal.sleep_goal_minutes ?? 420
  return {
    ...draft,
    sleep_goal_type: goal.sleep_goal_type,
    sleep_hours: String(Math.floor(sleep / 60)),
    sleep_minutes: String(sleep % 60),
    bedtime: goal.bedtime || draft.bedtime,
    wake_time: goal.wake_time || draft.wake_time,
    work_hours: String(Math.floor((goal.work_goal_minutes ?? 0) / 60)),
    work_minutes: String((goal.work_goal_minutes ?? 0) % 60),
    tasks: tasks.length ? tasks.map((task) => ({ id: task.id, title: task.title })) : draft.tasks,
    ...Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, goal[key] == null ? '' : String(goal[key])])),
    ...Object.fromEntries(MEAL_TIME_KEYS.map((key) => [key, goal[key] || ''])),
  }
}

// GET /goal/nutrition_defaults の値で栄養目標と食事時刻を埋める
export function applyNutritionDefaults(draft, defaults) {
  return {
    ...draft,
    ...Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, String(defaults[key])])),
  }
}

function toMinutes(hours, minutes) {
  return Number(hours || 0) * 60 + Number(minutes || 0)
}

function isWholeNumber(value) {
  return value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0
}

// 新規登録③（睡眠・運動・ワーク）の入力チェック
export function validateBasics(draft) {
  const errors = []
  if (draft.sleep_goal_type === 'duration') {
    const minutes = toMinutes(draft.sleep_hours, draft.sleep_minutes)
    if (!isWholeNumber(draft.sleep_hours) || !isWholeNumber(draft.sleep_minutes) || minutes <= 0 || minutes > 24 * 60) {
      errors.push('睡眠時間は0より長く、24時間以内で入力してください')
    }
  } else if (!draft.bedtime || !draft.wake_time) {
    errors.push('就寝時刻と起床時刻を入力してください')
  } else if (draft.bedtime === draft.wake_time) {
    errors.push('就寝時刻と起床時刻は別の時刻にしてください')
  }
  if (draft.tasks.every((task) => !task.title.trim())) {
    errors.push('運動タスクを1件以上入力してください')
  }
  const work = toMinutes(draft.work_hours, draft.work_minutes)
  if (!isWholeNumber(draft.work_hours) || !isWholeNumber(draft.work_minutes) || work <= 0 || work > 24 * 60) {
    errors.push('ワーク時間は0より長く、24時間以内で入力してください')
  }
  return errors
}

// 新規登録④（食事の目標・食事時刻）の入力チェック
export function validateMeals(draft) {
  const errors = []
  NUTRIENT_FIELDS.forEach(({ key, label }) => {
    const value = draft[key]
    if (value === '' || Number.isNaN(Number(value)) || Number(value) <= 0) {
      errors.push(`${label}の目標は0より大きい数で入力してください`)
    }
  })
  MEAL_TIME_FIELDS.forEach(({ key, label }) => {
    if (!draft[key]) errors.push(`${label}の時刻を入力してください`)
  })
  return errors
}

// PUT /goal に送る形
export function toGoalPayload(draft) {
  const duration = draft.sleep_goal_type === 'duration'
  return {
    goal: {
      sleep_goal_type: draft.sleep_goal_type,
      sleep_goal_minutes: duration ? toMinutes(draft.sleep_hours, draft.sleep_minutes) : null,
      bedtime: duration ? null : draft.bedtime,
      wake_time: duration ? null : draft.wake_time,
      work_goal_minutes: toMinutes(draft.work_hours, draft.work_minutes),
      ...Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, Number(draft[key])])),
      ...Object.fromEntries(MEAL_TIME_KEYS.map((key) => [key, draft[key]])),
    },
    // 空欄の行は送らない（サーバーでも無視する）。並び順は配列の順
    exercise_tasks: draft.tasks
      .filter((task) => task.title.trim())
      .map((task) => (task.id ? { id: task.id, title: task.title.trim() } : { title: task.title.trim() })),
  }
}
