import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addItem, createCart, itemCount, removeItem, updateQuantity } from './src/cart.js'
import { amountToNextTierCents } from './src/pricing.js'
import { orderTotals } from './src/totals.js'
import { formatCents, receiptFor } from './src/receipt.js'

function cartWith(...items) {
  const cart = createCart()
  for (const item of items) {
    addItem(cart, item)
  }
  return cart
}

test('empty cart totals to zero everywhere', () => {
  assert.deepEqual(orderTotals(createCart(), { taxRate: 0.08 }), {
    subtotalCents: 0,
    discountCents: 0,
    taxCents: 0,
    totalCents: 0,
  })
})

test('single line item with no tax', () => {
  const cart = cartWith({ sku: 'mug', name: 'Mug', unitPriceCents: 1999, quantity: 2 })
  assert.deepEqual(orderTotals(cart), {
    subtotalCents: 3998,
    discountCents: 0,
    taxCents: 0,
    totalCents: 3998,
  })
})

test('adding the same sku merges quantities into one line', () => {
  const cart = cartWith(
    { sku: 'pen', name: 'Pen', unitPriceCents: 250, quantity: 3 },
    { sku: 'pen', name: 'Pen', unitPriceCents: 250, quantity: 2 },
  )
  assert.equal(cart.lines.length, 1)
  assert.equal(itemCount(cart), 5)
  assert.equal(orderTotals(cart).subtotalCents, 1250)
})

test('updateQuantity and removeItem adjust the cart', () => {
  const cart = cartWith(
    { sku: 'pen', name: 'Pen', unitPriceCents: 250, quantity: 2 },
    { sku: 'pad', name: 'Pad', unitPriceCents: 400, quantity: 1 },
  )
  updateQuantity(cart, 'pen', 4)
  assert.equal(orderTotals(cart).subtotalCents, 1400)
  updateQuantity(cart, 'pen', 0)
  assert.equal(cart.lines.length, 1)
  removeItem(cart, 'pad')
  assert.deepEqual(orderTotals(cart), {
    subtotalCents: 0,
    discountCents: 0,
    taxCents: 0,
    totalCents: 0,
  })
})

test('tax applies to a cart below every discount tier', () => {
  const cart = cartWith({ sku: 'tee', name: 'Tee', unitPriceCents: 2000, quantity: 2 })
  assert.deepEqual(orderTotals(cart, { taxRate: 0.08 }), {
    subtotalCents: 4000,
    discountCents: 0,
    taxCents: 320,
    totalCents: 4320,
  })
})

test('tax on odd cents rounds to the nearest cent', () => {
  const down = cartWith({ sku: 'clip', name: 'Clip', unitPriceCents: 333, quantity: 1 })
  assert.deepEqual(orderTotals(down, { taxRate: 0.07 }), {
    subtotalCents: 333,
    discountCents: 0,
    taxCents: 23,
    totalCents: 356,
  })
  const up = cartWith({ sku: 'cord', name: 'Cord', unitPriceCents: 471, quantity: 1 })
  assert.deepEqual(orderTotals(up, { taxRate: 0.07 }), {
    subtotalCents: 471,
    discountCents: 0,
    taxCents: 33,
    totalCents: 504,
  })
})

test('subtotal exactly at the first tier boundary earns the 5% discount', () => {
  const cart = cartWith({ sku: 'lamp', name: 'Lamp', unitPriceCents: 2500, quantity: 2 })
  assert.deepEqual(orderTotals(cart), {
    subtotalCents: 5000,
    discountCents: 250,
    taxCents: 0,
    totalCents: 4750,
  })
})

test('subtotal one cent below the first tier gets no discount', () => {
  const cart = cartWith({ sku: 'vase', name: 'Vase', unitPriceCents: 4999, quantity: 1 })
  assert.deepEqual(orderTotals(cart), {
    subtotalCents: 4999,
    discountCents: 0,
    taxCents: 0,
    totalCents: 4999,
  })
})

test('mid tier cart discounts 10% before tax', () => {
  const cart = cartWith({ sku: 'desk', name: 'Desk', unitPriceCents: 5000, quantity: 4 })
  assert.deepEqual(orderTotals(cart, { taxRate: 0.1 }), {
    subtotalCents: 20000,
    discountCents: 2000,
    taxCents: 1800,
    totalCents: 19800,
  })
})

test('top tier cart discounts 15%', () => {
  const cart = cartWith({ sku: 'sofa', name: 'Sofa', unitPriceCents: 10000, quantity: 4 })
  assert.deepEqual(orderTotals(cart), {
    subtotalCents: 40000,
    discountCents: 6000,
    taxCents: 0,
    totalCents: 34000,
  })
})

test('amountToNextTierCents reports the gap to the next tier', () => {
  assert.equal(amountToNextTierCents(4000), 1000)
  assert.equal(amountToNextTierCents(5000), 10000)
  assert.equal(amountToNextTierCents(15000), 15000)
  assert.equal(amountToNextTierCents(30000), 0)
  assert.equal(amountToNextTierCents(45000), 0)
})

test('receipt renders whole-cent amounts', () => {
  assert.equal(formatCents(0), '$0.00')
  assert.equal(formatCents(5), '$0.05')
  assert.equal(formatCents(-1250), '-$12.50')
  const cart = cartWith({ sku: 'mug', name: 'Mug', unitPriceCents: 1999, quantity: 2 })
  assert.deepEqual(receiptFor(cart, { taxRate: 0.05 }), [
    'Mug x2 $39.98',
    'Subtotal $39.98',
    'Tax $2.00',
    'Total $41.98',
  ])
})
