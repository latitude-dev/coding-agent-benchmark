export function addBusinessDays(isoDate, n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('n must be a non-negative integer')
  }

  const date = parseIsoDate(isoDate)
  let remaining = n

  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (!isWeekend(date)) {
      remaining -= 1
    }
  }

  while (isWeekend(date)) {
    date.setUTCDate(date.getUTCDate() + 1)
  }

  return formatIsoDate(date)
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new TypeError('date must be in YYYY-MM-DD format')
  }
  const [, year, month, day] = match.map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function isWeekend(date) {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function formatIsoDate(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
