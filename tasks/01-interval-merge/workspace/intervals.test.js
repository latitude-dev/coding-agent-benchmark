import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeIntervals } from './src/intervals.js'

test('merges overlapping intervals', () => {
  assert.deepEqual(mergeIntervals([[1, 3], [2, 6], [8, 10]]), [[1, 6], [8, 10]])
})

test('merges touching intervals', () => {
  assert.deepEqual(mergeIntervals([[1, 3], [3, 5]]), [[1, 5]])
})

test('keeps an interval that contains a later one', () => {
  assert.deepEqual(mergeIntervals([[1, 10], [2, 3]]), [[1, 10]])
})

test('handles unsorted input', () => {
  assert.deepEqual(mergeIntervals([[8, 10], [1, 10], [2, 3]]), [[1, 10]])
})

test('handles empty and single-interval input', () => {
  assert.deepEqual(mergeIntervals([]), [])
  assert.deepEqual(mergeIntervals([[4, 5]]), [[4, 5]])
})

test('does not mutate the input', () => {
  const input = [[2, 3], [1, 10]]
  mergeIntervals(input)
  assert.deepEqual(input, [[2, 3], [1, 10]])
})
