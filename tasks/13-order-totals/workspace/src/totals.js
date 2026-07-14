import { cartSubtotalCents } from './cart.js'
import { discountFor } from './pricing.js'

export function orderTotals(cart, { taxRate = 0 } = {}) {
  if (typeof taxRate !== 'number' || taxRate < 0 || taxRate >= 1) {
    throw new RangeError(`taxRate must be a number in [0, 1), got ${taxRate}`)
  }
  const subtotalCents = cartSubtotalCents(cart)
  const discountCents = discountFor(subtotalCents)
  const taxableCents = subtotalCents - discountCents
  const taxCents = Math.round(taxableCents * taxRate)
  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  }
}
