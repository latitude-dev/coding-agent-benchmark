import { orderTotals } from './totals.js'

export function formatCents(cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.trunc(abs / 100)
  const remainder = String(abs % 100).padStart(2, '0')
  return `${sign}$${dollars}.${remainder}`
}

export function receiptFor(cart, options) {
  const totals = orderTotals(cart, options)
  const lines = cart.lines.map(
    (line) => `${line.name} x${line.quantity} ${formatCents(line.unitPriceCents * line.quantity)}`,
  )
  lines.push(`Subtotal ${formatCents(totals.subtotalCents)}`)
  if (totals.discountCents > 0) {
    lines.push(`Discount -${formatCents(totals.discountCents)}`)
  }
  lines.push(`Tax ${formatCents(totals.taxCents)}`)
  lines.push(`Total ${formatCents(totals.totalCents)}`)
  return lines
}
