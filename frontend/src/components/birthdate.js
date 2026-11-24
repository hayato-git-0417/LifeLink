export function birthdateParts(value) {
  const [year = '', month = '', day = ''] = (value || '').split('-')
  return { year, month: month ? String(Number(month)) : '', day: day ? String(Number(day)) : '' }
}

export function birthdateLimits(parts, today) {
  const [year, month, day] = today.split('-').map(Number)
  const sameYear = Number(parts.year) === year
  const daysInMonth = parts.month ? new Date(Number(parts.year) || 2000, Number(parts.month), 0).getDate() : 31
  return {
    month: sameYear ? month : 12,
    day: sameYear && Number(parts.month) === month ? day : daysInMonth,
  }
}

export function updateBirthdate(parts, key, value, today) {
  const next = { year: parts.year, month: parts.month, day: parts.day, [key]: value }
  if (Number(next.month) > birthdateLimits(next, today).month) next.month = ''
  if (Number(next.day) > birthdateLimits(next, today).day) next.day = ''
  next.value = next.year && next.month && next.day
    ? [next.year, next.month.padStart(2, '0'), next.day.padStart(2, '0')].join('-')
    : ''
  return next
}
