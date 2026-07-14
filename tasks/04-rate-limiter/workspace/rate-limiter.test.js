import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SlidingWindowRateLimiter } from './src/rate-limiter.js'

test('allows requests under the limit', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 1000 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(10), true)
  assert.equal(limiter.allow(20), true)
})

test('rejects the request that exceeds the limit inside the window', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(500), true)
  assert.equal(limiter.allow(999), false)
})

test('allows again once old requests fall out of the window', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(10), true)
  assert.equal(limiter.allow(2000), true)
  assert.equal(limiter.allow(2001), true)
  assert.equal(limiter.allow(2002), false)
})

test('a timestamp exactly windowMs old no longer occupies a slot', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(100), true)
  assert.equal(limiter.allow(1000), true)
  assert.equal(limiter.allow(1050), false)
})

test('rejected requests do not consume a slot', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(500), false)
  assert.equal(limiter.allow(600), false)
  assert.equal(limiter.allow(1000), true)
})

test('interleaved timestamps slide the window correctly', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 100 })
  assert.equal(limiter.allow(0), true)
  assert.equal(limiter.allow(40), true)
  assert.equal(limiter.allow(80), true)
  assert.equal(limiter.allow(90), false)
  assert.equal(limiter.allow(100), true)
  assert.equal(limiter.allow(120), false)
  assert.equal(limiter.allow(140), true)
})

test('sustains steady traffic across many windows', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 50 })
  const results = []
  for (let t = 0; t <= 200; t += 25) {
    results.push(limiter.allow(t))
  }
  assert.deepEqual(results, [true, true, true, true, true, true, true, true, true])
  assert.equal(limiter.allow(210), false)
})
