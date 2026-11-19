// 詳細（記録の履歴。デザイン p.5）。タブ: 睡眠／食事／運動／ワーク（タブは項目の色）。
// 7日ずつ表示し、前の週・次の週へ移れる。期間の合計（1行）と、「グラフ / 記録」の切り替えを出す。
// スマホ（375×667）でページがスクロールしないように、グラフは残りの高さいっぱいに描き、記録の一覧はその枠の中だけスクロールする。
// 睡眠・ワークのタブでは記録ごとに開始・終了日時の修正と削除ができる。睡眠の質は表示しない（spec.md 5章）
// /users/:id/details は相互フォローの人の詳細（読み取り専用。修正・削除なし。データは GET /users/:id/records）
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import { CATEGORY_COLORS } from '../../components/chartTheme.js'
import DurationChart from '../../components/DurationChart.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { ChevronLeftIcon, ChevronRightIcon, ExerciseIcon, MealIcon, SleepIcon, WorkIcon } from '../../components/icons.jsx'
import MealNutritionChart, { MealTimeChart } from './MealCharts.jsx'
import { mealNutrientSummary, mealTimeRows } from './mealChartData.js'
import ExerciseDurationChart from './ExerciseDurationChart.jsx'
import ExerciseRecordList from './ExerciseRecordList.jsx'
import { datesBetween, formatDate, formatMinutes, formatNumber, shiftDate, toDateString } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import { NUTRIENTS, sumNutrients } from '../meals/mealTypes.js'
import styles from './Details.module.css'
import TimedRecordList from './TimedRecordList.jsx'
import { TIMED_KINDS } from './timedKinds.js'

const TABS = [
  { key: 'sleep', label: '睡眠', path: '/sleep_records', Icon: SleepIcon },
  { key: 'meal', label: '食事', path: '/meals', Icon: MealIcon },
  { key: 'exercise', label: '運動', path: '/exercise_records', Icon: ExerciseIcon },
  { key: 'work', label: 'ワーク', path: '/work_records', Icon: WorkIcon },
]

const RANGE_DAYS = 7
// 表示の切り替え。睡眠・ワークは「時間」（日ごとの時間の棒グラフ）と「記録」の2つ（スコア・目標は今後なくすので出さない）
const VIEWS = [
  { key: 'chart', label: 'グラフ' },
  { key: 'list', label: '記録' },
]
const TIMED_VIEWS = [
  { key: 'hours', label: '時間' },
  { key: 'list', label: '記録' },
]
// 時間のグラフの説明（集計日の決まり。spec.md 2.1）
const HOURS_NOTES = {
  sleep: '起きた日にまとめています。計測中の睡眠は入りません。',
  work: '始めた日にまとめています。計測中のワークは入りません。',
}

export default function DetailsPage() {
  const { id: userId } = useParams()
  const readOnly = Boolean(userId)
  const today = toDateString()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((entry) => entry.key === searchParams.get('tab')) || TABS[0]
  const views = TIMED_KINDS[tab.key] ? TIMED_VIEWS : VIEWS
  const view = views.find((entry) => entry.key === searchParams.get('view')) || views[0]
  const [to, setTo] = useState(today)
  const from = shiftDate(to, -(RANGE_DAYS - 1))

  const [achievements, setAchievements] = useState(null)
  const [records, setRecords] = useState(null)
  const [errors, setErrors] = useState([])
  const [owner, setOwner] = useState(null)
  const [mealMetric, setMealMetric] = useState('calories')
  const [mealView, setMealView] = useState('nutrition')
  const nutrient = NUTRIENTS.find((item) => item.key === mealMetric) || NUTRIENTS[0]

  const load = useCallback(async () => {
    const params = { from, to }
    if (userId) {
      const data = await api(`/users/${userId}/records`, { params: { ...params, tab: tab.key } })
      return { scores: { daily_achievements: data.daily_achievements, current_points: data.current_points }, list: data }
    }
    const [scores, list, taskData] = await Promise.all([
      tab.key === 'meal' ? Promise.resolve({ daily_achievements: [], current_points: {} }) : api('/daily_achievements', { params }),
      api(tab.path, { params }),
      tab.key === 'exercise' ? api('/exercise_tasks/today') : tab.key === 'meal' ? api('/goal') : Promise.resolve(null),
    ])
    if (tab.key === 'exercise') {
      const apiTitles = Array.isArray(list.exercise_task_titles) ? list.exercise_task_titles : []
      const activeTaskTitles = (taskData?.exercise_tasks || []).map((task) => task.title)
      list.exercise_task_titles = [...new Set([...apiTitles, ...activeTaskTitles])]
    }
    if (tab.key === 'meal') list.meal_goal = taskData?.goal
    return { scores, list }
  }, [from, to, tab.key, tab.path, userId])

  // 相互フォローの人の詳細では、見出しに名前を出す
  useEffect(() => {
    if (!userId) return undefined
    let active = true
    api(`/users/${userId}`)
      .then((data) => active && setOwner(data.user))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    let active = true
    load()
      .then(({ scores, list }) => {
        if (!active) return
        setAchievements(scores)
        setRecords(list)
      })
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [load])

  // 修正・削除のあと（スコアが計算し直されるのでグラフも取り直す）
  const reload = useCallback(async () => {
    try {
      const { scores, list } = await load()
      setAchievements(scores)
      setRecords(list)
    } catch (error) {
      setErrors(error.messages)
    }
  }, [load])

  const reset = () => {
    setAchievements(null)
    setRecords(null)
    setErrors([])
  }
  const changeTab = (key) => {
    if (key === tab.key) return
    reset()
    // 「記録」を見ていたら記録のまま。グラフ系はそのタブの最初の表示（睡眠・ワークは時間）にする
    setSearchParams(view.key === 'list' ? { tab: key, view: 'list' } : { tab: key }, { replace: true })
  }
  const changeView = (key) => setSearchParams({ tab: tab.key, view: key }, { replace: true })
  const changeWeek = (days) => {
    reset()
    setTo(shiftDate(to, days))
  }

  const dates = datesBetween(from, to)
  const loading = !achievements || !records

  return (
    <AppShell
      title={readOnly ? `${owner ? owner.name : ''}さんの詳細` : '詳細'}
      backTo={readOnly ? `/users/${userId}` : '/'}
    >
      <div className={styles.page}>
        <div className={styles.tabs} role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={entry.key === tab.key}
              data-kind={entry.key}
              className={`${styles.tab} ${entry.key === tab.key ? styles.tabActive : ''}`}
              onClick={() => changeTab(entry.key)}
            >
              <entry.Icon size={18} />
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.week}>
          <button type="button" className={styles.weekButton} onClick={() => changeWeek(-RANGE_DAYS)} aria-label="前の週">
            <ChevronLeftIcon size={18} />
          </button>
          <span className={styles.range}>
            {formatDate(from)} 〜 {formatDate(to)}
          </span>
          <button
            type="button"
            className={styles.weekButton}
            onClick={() => changeWeek(RANGE_DAYS)}
            disabled={to >= today}
            aria-label="次の週"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <ErrorList errors={errors} />
        {loading ? (
          !errors.length && <p className={form.loading}>読み込み中…</p>
        ) : (
          <>
            <Summary tab={tab.key} records={records} achievements={achievements.daily_achievements} nutrient={nutrient} />

            <div className={`${form.segmented} ${styles.views}`} role="tablist" aria-label="表示">
              {views.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={entry.key === view.key}
                  className={`${form.segment} ${styles.view} ${entry.key === view.key ? form.segmentActive : ''}`}
                  onClick={() => changeView(entry.key)}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {view.key === 'hours' ? (
              <section className={`${styles.card} ${styles.panel} ${styles.chartPanel}`}>
                <h2 className={styles.heading}>
                  日ごとの{TIMED_KINDS[tab.key].durationLabel}
                </h2>
                <div className={styles.chart}>
                  <DurationChart
                    rows={durationRows(dates, records[`${tab.key}_records`])}
                    color={CATEGORY_COLORS[tab.key]}
                    label={TIMED_KINDS[tab.key].durationLabel}
                    height="100%"
                  />
                </div>
                <p className={styles.note}>{HOURS_NOTES[tab.key]}</p>
              </section>
            ) : view.key === 'chart' ? (
              <section className={`${styles.card} ${styles.panel} ${styles.chartPanel}`}>
                <h2 className={styles.heading}>
                  {tab.key === 'exercise'
                    ? '1日の運動時間（項目別）'
                    : mealView === 'time' ? '食事時刻の推移' : `日ごとの${nutrient.key === 'calories' ? '摂取カロリー' : nutrient.label}`}
                </h2>
                {tab.key === 'meal' && (
                  <div className={styles.mealControls}>
                    <div className={styles.mealSwitch} role="group" aria-label="食事グラフの表示">
                      {[['nutrition', '栄養'], ['time', '食事時刻']].map(([key, label]) => (
                        <button key={key} type="button" className={styles.mealSwitchButton} aria-pressed={mealView === key} onClick={() => setMealView(key)}>{label}</button>
                      ))}
                    </div>
                    {mealView === 'nutrition' && (
                      <label className={styles.mealMetric}>
                        <span>栄養素</span>
                        <select className={form.input} value={mealMetric} onChange={(event) => setMealMetric(event.target.value)}>
                          {NUTRIENTS.map((item) => <option key={item.key} value={item.key}>{item.label}（{item.unit}）</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}
                <div className={styles.chart}>
                  {tab.key === 'exercise' ? (
                    <ExerciseDurationChart
                      dates={dates}
                      dailyTotals={records.daily_duration_totals}
                      taskTitles={records.exercise_task_titles}
                      height="100%"
                    />
                  ) : (
                    mealView === 'time' ? (
                      <MealTimeChart dates={dates} meals={records.meals} />
                    ) : (
                      <MealNutritionChart dates={dates} meals={records.meals} nutrient={nutrient} goal={records.meal_goal?.[nutrient.goalKey]} />
                    )
                  )}
                </div>
                {tab.key !== 'exercise' && (
                  <p className={styles.note} title={mealView === 'nutrition' ? '朝食・昼食・夕食・間食で色分けしています。平均は栄養値の入力がある日で計算し、一部未入力の食事は合計に含めません。' : undefined}>
                    {mealView === 'time'
                      ? mealTimeRows(dates, records.meals).length
                        ? '食べた時刻を日本時間で表示しています。'
                        : readOnly ? '共有されている記録には食事時刻が含まれていません。' : 'この期間に時刻付きの食事記録はありません。'
                      : '未記録・未入力の日は非表示。平均は栄養値を入力した日で計算。'}
                  </p>
                )}
              </section>
            ) : (
              <section className={`${styles.card} ${styles.panel}`}>
                {TIMED_KINDS[tab.key] ? (
                  <TimedRecordList
                    kind={tab.key}
                    records={records[`${tab.key}_records`]}
                    readOnly={readOnly}
                    onChanged={reload}
                    onError={setErrors}
                  />
                ) : tab.key === 'meal' ? (
                  <MealDays dates={dates} meals={records.meals} readOnly={readOnly} />
                ) : readOnly ? (
                  <ExerciseDays
                    dates={dates}
                    distance={records}
                    achievements={achievements.daily_achievements}
                  />
                ) : (
                  <ExerciseRecordList
                    records={records.exercise_records}
                    taskTitles={records.exercise_task_titles}
                    onChanged={reload}
                    onError={setErrors}
                  />
                )}
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

// 時間のグラフの行。終わった記録を集計日（recorded_on）ごとに合計する。記録のない日は null
function durationRows(dates, records) {
  const minutesByDate = {}
  records
    .filter((record) => !record.in_progress)
    .forEach((record) => {
      minutesByDate[record.recorded_on] = (minutesByDate[record.recorded_on] ?? 0) + record.duration_minutes
    })
  return dates.map((date) => ({ date, minutes: minutesByDate[date] ?? null }))
}

function averageScore(tab, achievements) {
  if (achievements.length === 0) return null
  return achievements.reduce((sum, row) => sum + row[`${tab}_score`], 0) / achievements.length
}

// 期間の合計（上のタイル）
function Summary({ tab, records, achievements, nutrient }) {
  const tiles = []
  if (TIMED_KINDS[tab]) {
    const finished = records[`${tab}_records`].filter((record) => !record.in_progress)
    const total = finished.reduce((sum, record) => sum + record.duration_minutes, 0)
    const days = new Set(finished.map((record) => record.recorded_on)).size
    const label = tab === 'sleep' ? '睡眠時間' : 'ワーク時間'
    tiles.push({ label: `合計${label}`, value: formatMinutes(total) })
    tiles.push({ label: '1日平均', value: days ? formatMinutes(total / days) : '-' })
  } else if (tab === 'meal') {
    const summary = mealNutrientSummary(records.meals, nutrient.key)
    const label = nutrient.key === 'calories' ? 'カロリー' : nutrient.label
    tiles.push({ label: '合計' + label, value: summary.total == null ? '-' : formatNumber(summary.total) + ' ' + nutrient.unit })
    tiles.push({ label: '1日平均', value: summary.average == null ? '-' : formatNumber(summary.average) + ' ' + nutrient.unit })
    tiles.push({ label: '記録日数', value: summary.days + '日' })
  } else if (tab === 'exercise') {
    const durationDays = (Array.isArray(records.daily_duration_totals) ? records.daily_duration_totals : [])
      .filter((day) => Number(day.duration_minutes) > 0)
    const total = durationDays.reduce((sum, day) => sum + (Number(day.duration_minutes) || 0), 0)
    tiles.push({ label: '合計運動時間', value: formatMinutes(total) })
    tiles.push({ label: '1日平均', value: durationDays.length ? formatMinutes(total / durationDays.length) : '-' })
  }
  if (tab !== 'meal') {
    const average = averageScore(tab, achievements)
    tiles.push({ label: '平均スコア', value: average == null ? '-' : `${Math.round(average)}%` })
  }

  return (
    <div className={styles.tiles} title={tab === 'meal' ? '1日平均は選択した栄養素の入力がある日で計算しています。一部未入力の食事は合計に含みません。' : '1日平均は記録した日で割った値'}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.tile}>
          <span className={styles.tileLabel}>{tile.label}</span>
          <span className={styles.tileValue}>{tile.value}</span>
        </div>
      ))}
    </div>
  )
}

// 食事タブ: 日ごとの栄養値の合計（新しい日から）
function MealDays({ dates, meals, readOnly }) {
  const days = [...dates].reverse().map((date) => {
    const list = meals.filter((meal) => meal.recorded_on === date)
    return { date, count: list.length, totals: sumNutrients(list) }
  })
  return (
    <>
      {!readOnly && (
        <Link to={'/meals/list?date=' + dates[dates.length - 1]} state={{ fromDetails: true }} className={styles.mealListLink}>
          食事記録一覧へ<ChevronRightIcon size={16} />
        </Link>
      )}
      {meals.length === 0 ? <p className={styles.empty}>この期間の記録はありません。</p> : (
        <ul className={styles.records}>
          {days.filter((day) => day.count > 0).map((day) => {
            const Row = readOnly ? 'div' : Link
            const navigation = readOnly ? {} : { to: '/meals/list?date=' + day.date, state: { fromDetails: true }, 'aria-label': formatDate(day.date) + 'の食事記録一覧を見る' }
            return (
              <li key={day.date} className={styles.record}>
                <Row className={styles.mealRecordLink} {...navigation}>
                  <div className={styles.recordMain}>
                    <span className={styles.recordTitle}>
                      {formatDate(day.date)}
                      <span className={styles.recordTag}>{day.count}食</span>
                    </span>
                    <span className={styles.recordStrong}>{formatNumber(day.totals.calories)} kcal</span>
                    <span className={styles.recordSub}>
                      {NUTRIENTS.filter((n) => n.key !== 'calories')
                        .map((n) => n.label + ' ' + formatNumber(day.totals[n.key]) + n.unit)
                        .join('　')}
                    </span>
                  </div>
                  {!readOnly && <ChevronRightIcon size={18} />}
                </Row>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// 運動タブ: 日ごとのタスク達成（スコア）と移動距離
function ExerciseDays({ dates, distance, achievements }) {
  const byDate = Object.fromEntries(achievements.map((row) => [row.target_date, row]))
  const kmByDate = Object.fromEntries(distance.daily_totals.map((day) => [day.date, day.distance_km]))
  return (
    <ul className={styles.records}>
      {[...dates].reverse().map((date) => (
        <li key={date} className={styles.record}>
          <div className={styles.recordMain}>
            <span className={styles.recordTitle}>{formatDate(date)}</span>
          <span className={styles.recordSub}>
              タスク達成 <b>{byDate[date] ? `${Math.round(byDate[date].exercise_score)}%` : '-'}</b>　移動距離{' '}
              <b>{formatNumber(kmByDate[date] ?? 0)} km</b>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}