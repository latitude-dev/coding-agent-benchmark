export const DISCOUNT_TIERS = [
  { name: 'bronze', minSubtotalCents: 5000, rate: 0.05 },
  { name: 'silver', minSubtotalCents: 15000, rate: 0.1 },
  { name: 'gold', minSubtotalCents: 30000, rate: 0.15 },
]

export function tierFor(subtotalCents) {
  let match = null
  for (const tier of DISCOUNT_TIERS) {
    if (subtotalCents >= tier.minSubtotalCents) {
      match = tier
    }
  }
  return match
}

export function discountFor(subtotalCents) {
  const tier = tierFor(subtotalCents)
  return tier === null ? 0 : tier.rate
}

export function amountToNextTierCents(subtotalCents) {
  for (const tier of DISCOUNT_TIERS) {
    if (subtotalCents < tier.minSubtotalCents) {
      return tier.minSubtotalCents - subtotalCents
    }
  }
  return 0
}
