import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBus } from './src/bus.js'
import { once, oncePromise } from './src/once.js'
import { withReplay } from './src/replay.js'

test('handlers run in descending priority order', () => {
  const bus = createBus()
  const calls = []
  bus.subscribe('go', () => calls.push('low'), { priority: 1 })
  bus.subscribe('go', () => calls.push('high'), { priority: 9 })
  bus.subscribe('go', () => calls.push('default'))
  bus.emit('go')
  assert.deepEqual(calls, ['high', 'low', 'default'])
})

test('equal priorities keep subscription order', () => {
  const bus = createBus()
  const calls = []
  bus.subscribe('go', () => calls.push('first'))
  bus.subscribe('go', () => calls.push('second'))
  bus.subscribe('go', () => calls.push('third'))
  bus.emit('go')
  assert.deepEqual(calls, ['first', 'second', 'third'])
})

test('unsubscribe stops future deliveries', () => {
  const bus = createBus()
  const calls = []
  const off = bus.subscribe('tick', (payload) => calls.push(payload))
  bus.emit('tick', 1)
  assert.equal(off(), true)
  assert.equal(off(), false)
  bus.emit('tick', 2)
  assert.deepEqual(calls, [1])
  assert.equal(bus.listenerCount('tick'), 0)
  assert.equal(bus.hasListeners('tick'), false)
})

test('clear drops one channel or every channel', () => {
  const bus = createBus()
  bus.subscribe('a', () => {})
  bus.subscribe('b', () => {})
  bus.clear('a')
  assert.equal(bus.hasListeners('a'), false)
  assert.equal(bus.hasListeners('b'), true)
  bus.clear()
  assert.equal(bus.hasListeners('b'), false)
})

test('emit passes the payload and reports how many handlers ran', () => {
  const bus = createBus()
  const seen = []
  bus.subscribe('ping', (payload) => seen.push(payload))
  bus.subscribe('ping', (payload) => seen.push(payload * 10))
  assert.equal(bus.emit('ping', 4), 2)
  assert.deepEqual(seen, [4, 40])
  assert.equal(bus.emit('silent', 1), 0)
})

test('once fires a single time across sequential emits', () => {
  const bus = createBus()
  const calls = []
  once(bus, 'tick', (payload) => calls.push(payload))
  bus.emit('tick', 'a')
  bus.emit('tick', 'b')
  assert.deepEqual(calls, ['a'])
  assert.equal(bus.listenerCount('tick'), 0)
})

test('once can be cancelled before it fires', () => {
  const bus = createBus()
  const calls = []
  const off = once(bus, 'tick', (payload) => calls.push(payload))
  off()
  bus.emit('tick', 'a')
  assert.deepEqual(calls, [])
})

test('once fires a single time when the event is re-emitted during dispatch', () => {
  const bus = createBus()
  const seen = []
  let rebroadcast = false
  bus.subscribe(
    'sync',
    () => {
      if (!rebroadcast) {
        rebroadcast = true
        bus.emit('sync', 'inner')
      }
    },
    { priority: 10 },
  )
  once(bus, 'sync', (payload) => seen.push(payload))
  bus.emit('sync', 'outer')
  assert.deepEqual(seen, ['inner'])
})

test('oncePromise resolves with the first payload', async () => {
  const bus = createBus()
  const pending = oncePromise(bus, 'ready')
  bus.emit('ready', 7)
  bus.emit('ready', 8)
  assert.equal(await pending, 7)
})

test('unsubscribing another handler mid-emit does not affect the current dispatch', () => {
  const bus = createBus()
  const calls = []
  let offB
  bus.subscribe(
    'run',
    () => {
      calls.push('a')
      offB()
    },
    { priority: 5 },
  )
  offB = bus.subscribe('run', () => calls.push('b'))
  bus.emit('run')
  assert.deepEqual(calls, ['a', 'b'])
  bus.emit('run')
  assert.deepEqual(calls, ['a', 'b', 'a'])
})

test('handlers subscribed mid-emit only run on the next dispatch', () => {
  const bus = createBus()
  const calls = []
  bus.subscribe('boot', () => {
    calls.push('root')
    bus.subscribe('boot', () => calls.push('late'))
  })
  bus.emit('boot')
  assert.deepEqual(calls, ['root'])
  bus.emit('boot')
  assert.deepEqual(calls, ['root', 'root', 'late'])
})

test('replay delivers buffered events to a late subscriber, then live ones', () => {
  const bus = createBus()
  const replay = withReplay(bus, 'log')
  bus.emit('log', 1)
  bus.emit('log', 2)
  bus.emit('log', 3)
  const seen = []
  replay.subscribe((payload) => seen.push(payload))
  assert.deepEqual(seen, [1, 2, 3])
  bus.emit('log', 4)
  assert.deepEqual(seen, [1, 2, 3, 4])
})

test('replay keeps only the most recent events up to the limit', () => {
  const bus = createBus()
  const replay = withReplay(bus, 'log', { limit: 2 })
  bus.emit('log', 'a')
  bus.emit('log', 'b')
  bus.emit('log', 'c')
  assert.deepEqual(replay.buffered(), ['b', 'c'])
  const seen = []
  replay.subscribe((payload) => seen.push(payload))
  assert.deepEqual(seen, ['b', 'c'])
})

test('replay stop and flush end recording and empty the buffer', () => {
  const bus = createBus()
  const replay = withReplay(bus, 'log')
  bus.emit('log', 1)
  replay.stop()
  bus.emit('log', 2)
  assert.deepEqual(replay.buffered(), [1])
  replay.flush()
  assert.deepEqual(replay.buffered(), [])
})
