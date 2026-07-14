import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flattenTree, maxDepth } from './src/tree.js'

test('flattens a single node at depth zero', () => {
  assert.deepEqual(flattenTree({ id: 'a' }), [{ id: 'a', depth: 0 }])
})

test('assigns increasing depths along a linear chain', () => {
  const tree = { id: 'a', children: [{ id: 'b', children: [{ id: 'c' }] }] }
  assert.deepEqual(flattenTree(tree), [
    { id: 'a', depth: 0 },
    { id: 'b', depth: 1 },
    { id: 'c', depth: 2 },
  ])
})

test('siblings share the same depth', () => {
  const tree = { id: 'root', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
  assert.deepEqual(flattenTree(tree), [
    { id: 'root', depth: 0 },
    { id: 'a', depth: 1 },
    { id: 'b', depth: 1 },
    { id: 'c', depth: 1 },
  ])
})

test('a sibling after a deep subtree keeps its own depth', () => {
  const tree = {
    id: 'root',
    children: [{ id: 'a', children: [{ id: 'b', children: [{ id: 'c' }] }] }, { id: 'd' }],
  }
  assert.deepEqual(flattenTree(tree), [
    { id: 'root', depth: 0 },
    { id: 'a', depth: 1 },
    { id: 'b', depth: 2 },
    { id: 'c', depth: 3 },
    { id: 'd', depth: 1 },
  ])
})

test('visits a wide tree in depth-first pre-order', () => {
  const tree = {
    id: '1',
    children: [
      { id: '2', children: [{ id: '3' }, { id: '4' }] },
      { id: '5', children: [{ id: '6' }] },
    ],
  }
  assert.deepEqual(flattenTree(tree), [
    { id: '1', depth: 0 },
    { id: '2', depth: 1 },
    { id: '3', depth: 2 },
    { id: '4', depth: 2 },
    { id: '5', depth: 1 },
    { id: '6', depth: 2 },
  ])
})

test('treats explicit empty children arrays as leaves', () => {
  const tree = { id: 'root', children: [{ id: 'a', children: [] }, { id: 'b', children: [] }] }
  assert.deepEqual(flattenTree(tree), [
    { id: 'root', depth: 0 },
    { id: 'a', depth: 1 },
    { id: 'b', depth: 1 },
  ])
})

test('maxDepth reports the deepest node', () => {
  const tree = {
    id: 'root',
    children: [{ id: 'a', children: [{ id: 'b' }] }, { id: 'c', children: [{ id: 'd' }] }],
  }
  assert.equal(maxDepth(tree), 2)
  assert.equal(maxDepth(null), -1)
})
