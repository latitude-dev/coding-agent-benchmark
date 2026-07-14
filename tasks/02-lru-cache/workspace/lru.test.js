import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LruCache } from './src/lru.js'

test('stores and retrieves values', () => {
  const cache = new LruCache(3)
  cache.set('a', 1).set('b', 2)
  assert.equal(cache.get('a'), 1)
  assert.equal(cache.get('b'), 2)
  assert.equal(cache.size, 2)
})

test('evicts the least recently used entry when full', () => {
  const cache = new LruCache(2)
  cache.set('a', 1).set('b', 2).set('c', 3)
  assert.equal(cache.has('a'), false)
  assert.equal(cache.get('b'), 2)
  assert.equal(cache.get('c'), 3)
})

test('a get refreshes recency so another key is evicted', () => {
  const cache = new LruCache(2)
  cache.set('a', 1).set('b', 2)
  assert.equal(cache.get('a'), 1)
  cache.set('c', 3)
  assert.equal(cache.get('a'), 1)
  assert.equal(cache.has('b'), false)
  assert.equal(cache.get('c'), 3)
})

test('overwriting a key refreshes its recency', () => {
  const cache = new LruCache(2)
  cache.set('a', 1).set('b', 2).set('a', 10).set('c', 3)
  assert.equal(cache.get('a'), 10)
  assert.equal(cache.has('b'), false)
  assert.equal(cache.get('c'), 3)
})

test('capacity of one keeps only the latest entry', () => {
  const cache = new LruCache(1)
  cache.set('a', 1)
  assert.equal(cache.get('a'), 1)
  cache.set('b', 2)
  assert.equal(cache.has('a'), false)
  assert.equal(cache.get('b'), 2)
  assert.equal(cache.size, 1)
})

test('missing keys return undefined without side effects', () => {
  const cache = new LruCache(2)
  cache.set('a', 1)
  assert.equal(cache.get('nope'), undefined)
  assert.equal(cache.has('nope'), false)
  assert.equal(cache.size, 1)
})

test('mixed reads and writes track recency across several evictions', () => {
  const cache = new LruCache(3)
  cache.set('a', 1).set('b', 2).set('c', 3)
  assert.equal(cache.get('a'), 1)
  assert.equal(cache.get('b'), 2)
  cache.set('d', 4)
  assert.equal(cache.has('c'), false)
  assert.equal(cache.get('a'), 1)
  cache.set('e', 5)
  assert.equal(cache.has('b'), false)
  assert.deepEqual(
    ['a', 'd', 'e'].map((k) => cache.get(k)),
    [1, 4, 5],
  )
})
