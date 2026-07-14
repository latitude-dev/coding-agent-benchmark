import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatCents } from './src/money.js'

test('formats zero', () => {
  assert.equal(formatCents(0, '$'), '$0.00')
})

test('formats whole dollar amounts', () => {
  assert.equal(formatCents(300, '$'), '$3.00')
  assert.equal(formatCents(4200, '$'), '$42.00')
})

test('pads sub-dollar amounts', () => {
  assert.equal(formatCents(5, '$'), '$0.05')
  assert.equal(formatCents(99, '$'), '$0.99')
})

test('inserts thousand separators', () => {
  assert.equal(formatCents(123456789, '$'), '$1,234,567.89')
  assert.equal(formatCents(100000, '$'), '$1,000.00')
})

test('formats negative amounts with dollars', () => {
  assert.equal(formatCents(-123456, '$'), '-$1,234.56')
  assert.equal(formatCents(-300, '$'), '-$3.00')
})

test('keeps the sign on negative amounts under one dollar', () => {
  assert.equal(formatCents(-50, '$'), '-$0.50')
  assert.equal(formatCents(-5, '$'), '-$0.05')
  assert.equal(formatCents(-99, '$'), '-$0.99')
})

test('formats negative amounts with separators and other symbols', () => {
  assert.equal(formatCents(-123456789, '€'), '-€1,234,567.89')
})
