import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addBusinessDays } from './src/businessDays.js'

test('adds business days within a week', () => {
  assert.equal(addBusinessDays('2026-07-14', 2), '2026-07-16')
})

test('skips a single weekend', () => {
  assert.equal(addBusinessDays('2026-07-16', 2), '2026-07-20')
})

test('spans multiple weeks', () => {
  assert.equal(addBusinessDays('2026-07-14', 10), '2026-07-28')
})

test('starting on Saturday counts from the following Monday', () => {
  assert.equal(addBusinessDays('2026-07-11', 1), '2026-07-14')
  assert.equal(addBusinessDays('2026-07-11', 5), '2026-07-20')
})

test('starting on Sunday counts from the following Monday', () => {
  assert.equal(addBusinessDays('2026-07-12', 1), '2026-07-14')
})

test('adding zero business days on a weekday returns the same date', () => {
  assert.equal(addBusinessDays('2026-07-15', 0), '2026-07-15')
})

test('crosses month and year boundaries', () => {
  assert.equal(addBusinessDays('2026-07-31', 1), '2026-08-03')
  assert.equal(addBusinessDays('2026-12-31', 2), '2027-01-04')
})
