export function createCart() {
  return { lines: [] }
}

export function addItem(cart, { sku, name, unitPriceCents, quantity = 1 }) {
  if (typeof sku !== 'string' || sku === '') {
    throw new TypeError('sku must be a non-empty string')
  }
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError(`unitPriceCents must be a non-negative integer, got ${unitPriceCents}`)
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(`quantity must be a positive integer, got ${quantity}`)
  }
  const existing = cart.lines.find((line) => line.sku === sku)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.lines.push({ sku, name, unitPriceCents, quantity })
  }
  return cart
}

export function updateQuantity(cart, sku, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`quantity must be a non-negative integer, got ${quantity}`)
  }
  if (quantity === 0) {
    return removeItem(cart, sku)
  }
  const line = cart.lines.find((candidate) => candidate.sku === sku)
  if (!line) {
    throw new Error(`no line item with sku "${sku}"`)
  }
  line.quantity = quantity
  return cart
}

export function removeItem(cart, sku) {
  cart.lines = cart.lines.filter((line) => line.sku !== sku)
  return cart
}

export function itemCount(cart) {
  return cart.lines.reduce((count, line) => count + line.quantity, 0)
}

export function cartSubtotalCents(cart) {
  return cart.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
}
