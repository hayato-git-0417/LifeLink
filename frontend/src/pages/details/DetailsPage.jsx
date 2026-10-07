// 詳細（記録の履歴。デザイン p.5）。タブ: 睡眠／食事／運動／ワーク。
// 7日ずつ表示し、前の週・次の週へ移れる。期間の合計・スコアとポイントの推移グラフ・記録の一覧を出す。
// 睡眠・ワークのタブでは記録ごとに開始・終了日時の修正と削除ができる。睡眠の質は表示しない（spec.md 5章）
// /users/:id/details は相互フォローの人の詳細（読み取り専用。修正・削除なし。データは GET /users/:id/records）
import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import ScoreTrendChart from '../../components/ScoreTrendChart.jsx'
import { datesBetween, formatDate, formatDay, formatMinutes, formatNumber, shiftDate, toDateString } from '../../lib/format.js'
import { NUTRIENTS, sumNutrients } from '../meals/mealTypes.js'
import styles from './Details.module.css'
import TimedRecordList from './TimedRecordList.jsx'
import { TIMED_KINDS } from './timedKinds.js'

const TABS = [
  { key: 'sleep', label: '睡眠', path: '/sleep_records' },
  { key: 'meal', label: '食事', path: '/meals' },
  { key: 'exercise', label: '運動', path: '/exercise_records' },
  { key: 'work', label: 'ワーク', path: '/work_records' },
]

const RANGE_DAYS = 7

export default function DetailsPage() {
  const { id: userId } = useParams()
  const readOnly = Boolean(userId)
  const today = toDateString()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((entry) => entry.key === searchParams.get('tab')) || TABS[0]
  const [to, setTo] = useState(today)
  const from = shiftDate(to, -(RANGE_DAYS - 1))

  const [achievements, setAchievements] = useState(null)
  const [records, setRecords] = useState(null)
  const [errors, setErrors] = useState([])
  const [owner, setOwner] = useState(null)

  const load = useCallback(async () => {
    const params = { from, to }
    if (userId) {
      const data = await api(`/users/${userId}/records`, { params: { ...params, tab: tab.key } })
      return { scores: { daily_achievements: data.daily_achievements, current_points: data.current_points }, list: data }
    }
    const [scores, list] = await Promise.all([api('/daily_achievements', { params }), api(tab.path, { params })])
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
    setSearchParams({ tab: key }, { replace: true })
  }
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
              className={`${styles.tab} ${entry.key === tab.key ? styles.tabActive : ''}`}
              onClick={() => changeTab(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.week}>
          <button type="button" className={styles.weekButton} onClick={() => changeWeek(-RANGE_DAYS)} aria-label="前の週">
            ‹
          </button>
          <span>
            {formatDate(from)} 〜 {formatDate(to)}
          </span>
          <button
            type="button"
            className={styles.weekButton}
            onClick={() => changeWeek(RANGE_DAYS)}
            disabled={to >= today}
            aria-label="次の週"
          >
            ›
          </button>
        </div>

        <ErrorList errors={errors} />
        {loading ? (
          !errors.length && <p className={styles.loading}>読み込み中…</p>
        ) : (
          <>
            <Summary tab={tab.key} records={records} achievements={achievements.daily_achievements} />

            <section className={styles.card}>
              <h2 className={styles.heading}>{tab.label}のスコアとポイントの推移</h2>
              <ScoreTrendChart rows={chartRows(tab.key, dates, achievements, today)} />
              <p className={styles.note}>
                棒: その日のスコア（%）／線: 日付が変わって確定したポイント（今日は現在のポイント）
              </p>
            </section>

            <section className={styles.card}>
              <h2 className={styles.heading}>記録</h2>
              {TIMED_KINDS[tab.key] ? (
                <TimedRecordList
                  kind={tab.key}
                  records={records[`${tab.key}_records`]}
                  readOnly={readOnly}
                  onChanged={reload}
                  onError={setErrors}
                />
              ) : tab.key === 'meal' ? (
                <MealDays dates={dates} meals={records.meals} />
              ) : (
                <ExerciseDays dates={dates} distance={records} achievements={achievements.daily_achievements} />
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

// グラフの行。行のない日・確定前のポイントは null。今日のポイントは現在の値
function chartRows(tab, dates, achievements, today) {
  const byDate = Object.fromEntries(achievements.daily_achievements.map((row) => [row.target_date, row]))
  return dates.map((date) => {
    const row = byDate[date]
    let points = row?.[`${tab}_points`] ?? null
    if (date === today && points == null) points = achievements.current_points[tab]
    return { day: formatDay(date), score: row ? row[`${tab}_score`] : null, points }
  })
}

function averageScore(tab, achievements) {
  if (achievements.length === 0) return null
  return achievements.reduce((sum, row) => sum + row[`${tab}_score`], 0) / achievements.length
}

// 期間の合計（上のタイル）
function Summary({ tab, records, achievements }) {
  const tiles = []
  if (TIMED_KINDS[tab]) {
    const finished = records[`${tab}_records`].filter((record) => !record.in_progress)
    const total = finished.reduce((sum, record) => sum + record.duration_minutes, 0)
    const days = new Set(finished.map((record) => record.recorded_on)).size
    const label = tab === 'sleep' ? '睡眠時間' : 'ワーク時間'
    tiles.push({ label: `合計${label}`, value: formatMinutes(total) })
    tiles.push({ label: '1日平均（記録した日）', value: days ? formatMinutes(total / days) : '-' })
  } else if (tab === 'meal') {
    const totals = sumNutrients(records.meals)
    const days = new Set(records.meals.map((meal) => meal.recorded_on)).size
    tiles.push({ label: '合計カロリー', value: `${formatNumber(totals.calories)} kcal` })
    tiles.push({ label: '1日平均（記録した日）', value: days ? `${formatNumber(totals.calories / days)} kcal` : '-' })
  } else {
    const km = records.daily_totals.reduce((sum, day) => sum + day.distance_km, 0)
    tiles.push({ label: '合計移動距離', value: `${formatNumber(km)} km` })
    const completed = achievements.filter((row) => row.exercise_score >= 100).length
    tiles.push({ label: 'タスクを全部達成した日', value: `${completed} 日` })
  }
  const average = averageScore(tab, achievements)
  tiles.push({ label: '平均スコア', value: average == null ? '-' : `${Math.round(average)}%` })

  return (
    <div className={styles.tiles}>
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
function MealDays({ dates, meals }) {
  const days = [...dates].reverse().map((date) => {
    const list = meals.filter((meal) => meal.recorded_on === date)
    return { date, count: list.length, totals: sumNutrients(list) }
  })
  if (meals.length === 0) return <p className={styles.empty}>この期間の記録はありません。</p>
  return (
    <ul className={styles.records}>
      {days
        .filter((day) => day.count > 0)
        .map((day) => (
          <li key={day.date} className={styles.record}>
            <div className={styles.recordMain}>
              <span className={styles.recordTitle}>
                {formatDate(day.date)}　{day.count}食
              </span>
              <span>{formatNumber(day.totals.calories)} kcal</span>
              <span className={styles.recordDuration}>
                {NUTRIENTS.filter((n) => n.key !== 'calories')
                  .map((n) => `${n.label} ${formatNumber(day.totals[n.key])}${n.unit}`)
                  .join('　')}
              </span>
            </div>
          </li>
        ))}
    </ul>
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
            <span>
              タスク達成 {byDate[date] ? `${Math.round(byDate[date].exercise_score)}%` : '-'}　移動距離{' '}
              {formatNumber(kmByDate[date] ?? 0)} km
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
