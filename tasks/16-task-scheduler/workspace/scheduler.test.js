import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planOrder } from './src/order.js'
import { runTasks } from './src/runner.js'

const runAll = () => {}
const failing = (...names) => (task) => {
  if (names.includes(task.name)) throw new Error(`${task.name} exploded`)
}

test('orders a linear chain by dependencies', () => {
  const tasks = [
    { name: 'c', dependsOn: ['b'] },
    { name: 'b', dependsOn: ['a'] },
    { name: 'a' },
  ]
  assert.deepEqual(planOrder(tasks), ['a', 'b', 'c'])
})

test('orders a diamond with name tiebreaks', () => {
  const tasks = [
    { name: 'a' },
    { name: 'b', dependsOn: ['a'] },
    { name: 'c', dependsOn: ['a'] },
    { name: 'd', dependsOn: ['b', 'c'] },
  ]
  assert.deepEqual(planOrder(tasks), ['a', 'b', 'c', 'd'])
})

test('rejects a dependency cycle', () => {
  const tasks = [
    { name: 'a', dependsOn: ['b'] },
    { name: 'b', dependsOn: ['a'] },
  ]
  assert.throws(() => planOrder(tasks), /cycle/)
})

test('rejects an unknown dependency', () => {
  assert.throws(() => planOrder([{ name: 'a', dependsOn: ['ghost'] }]), /unknown/)
})

test('a task that becomes ready outranks lower-priority waiting tasks', () => {
  const tasks = [
    { name: 'fetch', priority: 5 },
    { name: 'transform', priority: 4, dependsOn: ['fetch'] },
    { name: 'archive', priority: 2 },
    { name: 'cleanup', priority: 1 },
  ]
  assert.deepEqual(planOrder(tasks), ['fetch', 'transform', 'archive', 'cleanup'])
})

test('skip cascade is logged before lower-priority work', () => {
  const tasks = [
    { name: 'build', priority: 5 },
    { name: 'test', priority: 4, dependsOn: ['build'] },
    { name: 'package', priority: 3, dependsOn: ['test'] },
    { name: 'lint', priority: 2 },
    { name: 'docs', priority: 1 },
  ]
  const { log } = runTasks(tasks, failing('build'))
  assert.deepEqual(
    log.map(({ name, status }) => ({ name, status })),
    [
      { name: 'build', status: 'failed' },
      { name: 'test', status: 'skipped' },
      { name: 'package', status: 'skipped' },
      { name: 'lint', status: 'ok' },
      { name: 'docs', status: 'ok' },
    ],
  )
  assert.equal(log[1].blockedBy, 'build')
  assert.equal(log[2].blockedBy, 'test')
})

test('independent components all run with dependencies first', () => {
  const tasks = [
    { name: 'a1' },
    { name: 'a2', dependsOn: ['a1'] },
    { name: 'b1' },
    { name: 'b2', dependsOn: ['b1'] },
  ]
  const order = planOrder(tasks)
  assert.deepEqual([...order].sort(), ['a1', 'a2', 'b1', 'b2'])
  assert.ok(order.indexOf('a1') < order.indexOf('a2'))
  assert.ok(order.indexOf('b1') < order.indexOf('b2'))
})

test('handles a single task', () => {
  const { order, log } = runTasks([{ name: 'solo' }], runAll)
  assert.deepEqual(order, ['solo'])
  assert.deepEqual(log, [{ name: 'solo', status: 'ok' }])
})

test('plan is identical across shuffled insertion orders', () => {
  const base = [
    { name: 'root', priority: 3 },
    { name: 'mid', priority: 2, dependsOn: ['root'] },
    { name: 'leaf', priority: 1, dependsOn: ['mid'] },
    { name: 'side', priority: 4 },
    { name: 'extra', priority: 0 },
  ]
  const permutations = [
    [0, 1, 2, 3, 4],
    [4, 3, 2, 1, 0],
    [2, 0, 4, 1, 3],
  ]
  const plans = permutations.map((perm) => planOrder(perm.map((i) => base[i])))
  assert.deepEqual(plans[1], plans[0])
  assert.deepEqual(plans[2], plans[0])
})

test('a failure skips dependents but not unrelated tasks', () => {
  const tasks = [
    { name: 'a' },
    { name: 'b', dependsOn: ['a'] },
    { name: 'c' },
  ]
  const { status } = runTasks(tasks, failing('a'))
  assert.equal(status.get('a'), 'failed')
  assert.equal(status.get('b'), 'skipped')
  assert.equal(status.get('c'), 'ok')
})

test('failure details are recorded in the log', () => {
  const tasks = [{ name: 'a' }, { name: 'b', dependsOn: ['a'] }]
  const { log } = runTasks(tasks, failing('a'))
  assert.deepEqual(log, [
    { name: 'a', status: 'failed', error: 'a exploded' },
    { name: 'b', status: 'skipped', blockedBy: 'a' },
  ])
})
