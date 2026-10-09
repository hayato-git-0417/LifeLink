// 詳細画面の睡眠・ワーク（API のパスと、開始・終了の項目名・表示名）
export const TIMED_KINDS = {
  sleep: {
    path: '/sleep_records',
    key: 'sleep_record',
    start: 'slept_at',
    finish: 'woke_at',
    startLabel: '就寝',
    finishLabel: '起床',
    durationLabel: '睡眠時間',
  },
  work: {
    path: '/work_records',
    key: 'work_record',
    start: 'started_at',
    finish: 'ended_at',
    startLabel: '開始',
    finishLabel: '終了',
    durationLabel: 'ワーク時間',
    hasTitle: true,
  },
}
