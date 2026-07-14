import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePointer } from './src/pointer.js'
import { applyPatch, PatchError } from './src/patch.js'

test('parses pointer escapes', () => {
  assert.deepEqual(parsePointer('/a~1b/~0c'), ['a/b', '~c'])
  assert.deepEqual(parsePointer('/~01'), ['~1'])
  assert.deepEqual(parsePointer(''), [])
})

test('patches keys that contain escaped characters', () => {
  const doc = { 'a/b': 1, 'm~n': 2 }
  const result = applyPatch(doc, [
    { op: 'replace', path: '/a~1b', value: 10 },
    { op: 'replace', path: '/m~0n', value: 20 },
  ])
  assert.deepEqual(result, { 'a/b': 10, 'm~n': 20 })
})

test('the - token appends to an array', () => {
  const result = applyPatch({ list: [1, 2] }, [
    { op: 'add', path: '/list/-', value: 3 },
  ])
  assert.deepEqual(result, { list: [1, 2, 3] })
})

test('adds a member deep in the document', () => {
  const result = applyPatch({ a: { b: {} } }, [
    { op: 'add', path: '/a/b/c', value: 1 },
  ])
  assert.deepEqual(result, { a: { b: { c: 1 } } })
})

test('replaces a value inside an array element', () => {
  const doc = { items: [{ id: 1, qty: 2 }, { id: 2, qty: 5 }] }
  const result = applyPatch(doc, [{ op: 'replace', path: '/items/1/qty', value: 9 }])
  assert.deepEqual(result, { items: [{ id: 1, qty: 2 }, { id: 2, qty: 9 }] })
})

test('removes members and array elements at depth', () => {
  const objResult = applyPatch({ a: { b: { c: 1, d: 2 } } }, [
    { op: 'remove', path: '/a/b/c' },
  ])
  assert.deepEqual(objResult, { a: { b: { d: 2 } } })

  const arrResult = applyPatch({ items: [1, 2, 3] }, [
    { op: 'remove', path: '/items/1' },
  ])
  assert.deepEqual(arrResult, { items: [1, 3] })
})

test('applies a sequence of operations', () => {
  const doc = { user: { name: 'ada', tags: ['x'] } }
  const result = applyPatch(doc, [
    { op: 'add', path: '/user/tags/-', value: 'y' },
    { op: 'replace', path: '/user/name', value: 'grace' },
    { op: 'add', path: '/user/active', value: true },
    { op: 'remove', path: '/user/tags/0' },
  ])
  assert.deepEqual(result, { user: { name: 'grace', tags: ['y'], active: true } })
})

test('a failing operation throws PatchError with its index', () => {
  assert.throws(
    () => applyPatch({ a: 1 }, [{ op: 'replace', path: '/missing', value: 2 }]),
    (error) => error instanceof PatchError && error.index === 0,
  )
  assert.throws(
    () => applyPatch({ a: 1 }, [
      { op: 'add', path: '/b', value: 2 },
      { op: 'move', path: '/a' },
    ]),
    (error) => error instanceof PatchError && error.index === 1,
  )
})

test('a rejected patch leaves the document unchanged at depth', () => {
  const doc = { user: { name: 'ada', tags: ['x'] }, count: 1 }
  const before = structuredClone(doc)
  assert.throws(
    () =>
      applyPatch(doc, [
        { op: 'replace', path: '/user/name', value: 'grace' },
        { op: 'replace', path: '/user/missing', value: 1 },
      ]),
    PatchError,
  )
  assert.deepEqual(doc, before)
})

test('a rejected patch leaves nested arrays unchanged', () => {
  const doc = { list: [1, 2, 3] }
  assert.throws(
    () =>
      applyPatch(doc, [
        { op: 'add', path: '/list/-', value: 4 },
        { op: 'remove', path: '/list/9' },
      ]),
    PatchError,
  )
  assert.deepEqual(doc.list, [1, 2, 3])
})

test('the patched result does not alias the input document', () => {
  const doc = { settings: { theme: 'dark' } }
  const result = applyPatch(doc, [
    { op: 'replace', path: '/settings/theme', value: 'light' },
  ])
  assert.notEqual(result, doc)
  assert.equal(result.settings.theme, 'light')
  assert.equal(doc.settings.theme, 'dark')
})

test('add with the root pointer replaces the whole document', () => {
  const doc = { a: 1 }
  const result = applyPatch(doc, [{ op: 'add', path: '', value: { b: 2 } }])
  assert.deepEqual(result, { b: 2 })
  assert.deepEqual(doc, { a: 1 })
})
