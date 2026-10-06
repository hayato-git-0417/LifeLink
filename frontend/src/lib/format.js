// 日付・時刻・数値の表示用。日時はブラウザの時刻（日本時間を想定）で扱う

const pad = (n) => String(n).padStart(2, '0')

// Date → "2026-10-07"（input type=date・API の date パラメータ用）
export function toDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Date → "2026-10-07T12:30"（input type=datetime-local 用）
export function toDateTimeLocal(date = new Date()) {
  return `${toDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// "2026-10-07T12:30" → API に送る ISO 8601（タイムゾーンつき）
export function fromDateTimeLocal(value) {
  return new Date(value).toISOString()
}

// ISO → "12:30"
export function formatTime(iso) {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ISO / "2026-10-07" → "2026/10/07(水)"
export function formatDate(value) {
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}(${WEEKDAYS[date.getDay()]})`
}

// "2026-10-07" → "7日"（グラフの目盛り）
export function formatDay(dateString) {
  return `${Number(dateString.slice(8, 10))}日`
}

// 分 → "6時間30分"
export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest}分`
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
}

// ミリ秒 → "1:05:09"（ワークの経過時間）
export function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

// 小数1桁まで（末尾の .0 は消す）
export function formatNumber(value) {
  if (value == null || value === '') return '-'
  return String(Math.round(Number(value) * 10) / 10)
}
