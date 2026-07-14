import { test } from 'node:test'
import assert from 'node:assert/strict'
import { debounce } from './src/debounce.js'

function createScheduler() {
  let now = 0
  let nextId = 1
  const tasks = new Map()
  return {
    setTimeout(callback, ms) {
      const id = nextId++
      tasks.set(id, { callback, at: now + ms })
      return id
    },
    clearTimeout(id) {
      tasks.delete(id)
    },
    tick(ms) {
      now += ms
      const due = [...tasks.entries()]
        .filter(([, task]) => task.at <= now)
        .sort((a, b) => a[1].at - b[1].at)
      for (const [id, task] of due) {
        tasks.delete(id)
        task.callback()
      }
    },
  }
}

test('does not fire before the wait elapses', () => {
  const scheduler = createScheduler()
  const calls = []
  const debounced = debounce((...args) => calls.push(args), 50, { scheduler })
  debounced('a')
  scheduler.tick(49)
  assert.deepEqual(calls, [])
  scheduler.tick(1)
  assert.deepEqual(calls, [['a']])
})

test('a single call fires exactly once with its arguments', () => {
  const scheduler = createScheduler()
  const calls = []
  const debounced = debounce((...args) => calls.push(args), 50, { scheduler })
  debounced(1, 2)
  scheduler.tick(200)
  assert.deepEqual(calls, [[1, 2]])
})

test('rapid calls inside the window coalesce into one invocation', () => {
  const scheduler = createScheduler()
  let count = 0
  const debounced = debounce(() => count++, 50, { scheduler })
  debounced()
  scheduler.tick(10)
  debounced()
  scheduler.tick(10)
  debounced()
  scheduler.tick(50)
  assert.equal(count, 1)
})

test('the trailing invocation receives the last call arguments', () => {
  const scheduler = createScheduler()
  const calls = []
  const debounced = debounce((...args) => calls.push(args), 50, { scheduler })
  debounced('l')
  scheduler.tick(10)
  debounced('la')
  scheduler.tick(10)
  debounced('lat')
  scheduler.tick(50)
  assert.deepEqual(calls, [['lat']])
})

test('a new call inside the window resets the timer', () => {
  const scheduler = createScheduler()
  const calls = []
  const debounced = debounce((...args) => calls.push(args), 50, { scheduler })
  debounced('first')
  scheduler.tick(30)
  debounced('second')
  scheduler.tick(30)
  assert.deepEqual(calls, [])
  scheduler.tick(20)
  assert.deepEqual(calls, [['second']])
})

test('separate windows fire separately with their own arguments', () => {
  const scheduler = createScheduler()
  const calls = []
  const debounced = debounce((...args) => calls.push(args), 50, { scheduler })
  debounced('one')
  scheduler.tick(50)
  debounced('two')
  scheduler.tick(50)
  assert.deepEqual(calls, [['one'], ['two']])
})
