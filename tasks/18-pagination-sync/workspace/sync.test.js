import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeCursor, decodeCursor, advanceCursor } from './src/cursor.js'
import { fetchAllItems } from './src/fetcher.js'
import { mergeItems, syncCollection } from './src/merge.js'

function records(count) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `n${i + 1}` }))
}

function makeServer(data, truncateAt = {}) {
  const offsetsSeen = []
  const fetchPage = (cursor) => {
    const { offset, pageSize } = decodeCursor(cursor)
    offsetsSeen.push(offset)
    const cap = Math.min(pageSize, truncateAt[offset] ?? pageSize)
    const items = data.slice(offset, offset + cap)
    return { items, done: offset + items.length >= data.length }
  }
  return { fetchPage, offsetsSeen }
}

const ids = (items) => items.map((item) => item.id)

test('cursors roundtrip, advance, and reject garbage', () => {
  const cursor = encodeCursor({ offset: 12, pageSize: 50, sortKey: 'name' })
  assert.equal(typeof cursor, 'string')
  assert.deepEqual(decodeCursor(cursor), { offset: 12, pageSize: 50, sortKey: 'name' })
  assert.deepEqual(decodeCursor(advanceCursor(cursor, 5)), {
    offset: 17,
    pageSize: 50,
    sortKey: 'name',
  })
  assert.throws(() => decodeCursor('not a cursor!!'), /malformed/)
})

test('fetches a collection that fits in one page', () => {
  const server = makeServer(records(2))
  const items = fetchAllItems(server.fetchPage, { pageSize: 5, sortKey: 'name' })
  assert.deepEqual(ids(items), [1, 2])
  assert.deepEqual(server.offsetsSeen, [0])
})

test('fetches an exact multiple of the page size', () => {
  const server = makeServer(records(6))
  const items = fetchAllItems(server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(ids(items), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(server.offsetsSeen, [0, 3])
})

test('fetches a collection with a short final page', () => {
  const server = makeServer(records(7))
  const items = fetchAllItems(server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(ids(items), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(server.offsetsSeen, [0, 3, 6])
})

test('loses nothing when the server truncates a middle page', () => {
  const server = makeServer(records(7), { 3: 2 })
  const { items } = syncCollection([], server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(ids(items), [1, 2, 3, 4, 5, 6, 7])
})

test('loses nothing when the server truncates the first page', () => {
  const server = makeServer(records(5), { 0: 1 })
  const { items } = syncCollection([], server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(ids(items), [1, 2, 3, 4, 5])
})

test('deduplicates ids when pages overlap', () => {
  const pages = new Map([
    [0, { items: [{ id: 1, name: 'n1' }, { id: 2, name: 'n2' }, { id: 3, name: 'n3' }], done: false }],
    [3, { items: [{ id: 3, name: 'n3-fresh' }, { id: 4, name: 'n4' }, { id: 5, name: 'n5' }], done: true }],
  ])
  const fetchPage = (cursor) => pages.get(decodeCursor(cursor).offset)
  const result = syncCollection([], fetchPage, { pageSize: 3, sortKey: 'id' })
  assert.deepEqual(ids(result.items), [1, 2, 3, 4, 5])
  assert.equal(result.items[2].name, 'n3-fresh')
  assert.equal(result.added, 5)
  assert.equal(result.updated, 0)
})

test('handles an empty collection', () => {
  const server = makeServer([])
  const result = syncCollection([], server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(result, { items: [], added: 0, updated: 0 })
  assert.deepEqual(server.offsetsSeen, [0])
})

test('merge keeps the list sorted after updates', () => {
  const cached = [
    { id: 1, name: 'apple' },
    { id: 3, name: 'cherry' },
  ]
  const fetched = [
    { id: 2, name: 'banana' },
    { id: 1, name: 'zebra' },
  ]
  const merged = mergeItems(cached, fetched, 'name')
  assert.deepEqual(merged.map((item) => item.name), ['banana', 'cherry', 'zebra'])
})

test('sync counts updates and keeps records the server no longer returns', () => {
  const cached = [
    { id: 1, name: 'stale' },
    { id: 99, name: 'archived' },
  ]
  const server = makeServer(records(2))
  const result = syncCollection(cached, server.fetchPage, { pageSize: 3, sortKey: 'name' })
  assert.deepEqual(ids(result.items), [99, 1, 2])
  assert.equal(result.items[1].name, 'n1')
  assert.equal(result.added, 1)
  assert.equal(result.updated, 1)
})

test('the fetcher forwards page size and sort key in the cursor', () => {
  const decoded = []
  const fetchPage = (cursor) => {
    decoded.push(decodeCursor(cursor))
    return { items: [{ id: 1, name: 'n1' }], done: true }
  }
  fetchAllItems(fetchPage, { pageSize: 25, sortKey: 'name' })
  assert.deepEqual(decoded, [{ offset: 0, pageSize: 25, sortKey: 'name' }])
})
