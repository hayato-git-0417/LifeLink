// 進化の表示用の整形（進化カード・進化のテストパネルで共通）

// 1234567 → "1,234,567"
export function formatPoints(points) {
  return points.toLocaleString('ja-JP')
}

// 倍率は 10 分の 1 単位の整数で届く（14 → "1.4"、100 → "10"）
export function formatMultiplier(tenths) {
  return tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`
}

// 増減を符号つきで（+120 / −400 / ±0）
export function formatChange(amount) {
  if (amount > 0) return `+${formatPoints(amount)}`
  if (amount < 0) return `−${formatPoints(-amount)}`
  return '±0'
}
