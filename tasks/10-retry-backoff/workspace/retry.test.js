import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retry } from './src/retry.js'

function recordingSleep() {
  const delays = []
  const sleep = (ms) => {
    delays.push(ms)
    return Promise.resolve()
  }
  return { delays, sleep }
}

function failTimes(n, result = 'ok') {
  let calls = 0
  return async () => {
    calls++
    if (calls <= n) throw new Error(`failure ${calls}`)
    return result
  }
}

test('returns immediately on first success without sleeping', async () => {
  const { delays, sleep } = recordingSleep()
  const result = await retry(failTimes(0, 42), { attempts: 5, baseDelayMs: 100, maxDelayMs: 400, sleep })
  assert.equal(result, 42)
  assert.deepEqual(delays, [])
})

test('succeeds after transient failures, sleeping between attempts', async () => {
  const { delays, sleep } = recordingSleep()
  const result = await retry(failTimes(2, 'done'), { attempts: 5, baseDelayMs: 50, maxDelayMs: 1000, sleep })
  assert.equal(result, 'done')
  assert.equal(delays.length, 2)
})

test('rethrows the last error when attempts are exhausted', async () => {
  const { sleep } = recordingSleep()
  await assert.rejects(
    retry(failTimes(10), { attempts: 3, baseDelayMs: 10, maxDelayMs: 100, sleep }),
    { message: 'failure 3' },
  )
})

test('delays grow exponentially from baseDelayMs', async () => {
  const { delays, sleep } = recordingSleep()
  await retry(failTimes(3, 'ok'), { attempts: 4, baseDelayMs: 100, maxDelayMs: 10000, sleep })
  assert.deepEqual(delays, [100, 200, 400])
})

test('delays are clamped at maxDelayMs', async () => {
  const { delays, sleep } = recordingSleep()
  await assert.rejects(
    retry(failTimes(10), { attempts: 6, baseDelayMs: 100, maxDelayMs: 400, sleep }),
  )
  assert.deepEqual(delays, [100, 200, 400, 400, 400])
})

test('does not sleep after the final failed attempt', async () => {
  const { delays, sleep } = recordingSleep()
  await assert.rejects(
    retry(failTimes(10), { attempts: 4, baseDelayMs: 100, maxDelayMs: 400, sleep }),
  )
  assert.equal(delays.length, 3)
})
