export function formatCents(cents, currency) {
  if (!Number.isInteger(cents)) {
    throw new TypeError('cents must be an integer')
  }
  if (typeof currency !== 'string' || currency.length === 0) {
    throw new TypeError('currency must be a non-empty string')
  }

  const dollars = Math.trunc(cents / 100)
  const sign = dollars < 0 ? '-' : ''
  const wholePart = groupThousands(String(Math.abs(dollars)))
  const fractionPart = String(Math.abs(cents % 100)).padStart(2, '0')

  return `${sign}${currency}${wholePart}.${fractionPart}`
}

function groupThousands(digits) {
  let grouped = ''
  for (let i = 0; i < digits.length; i++) {
    const remaining = digits.length - i
    if (i > 0 && remaining % 3 === 0) {
      grouped += ','
    }
    grouped += digits[i]
  }
  return grouped
}
