import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuery, stringifyQuery } from './src/query.js'

test('parses simple key-value pairs', () => {
  assert.deepEqual(parseQuery('a=1&b=2'), { a: '1', b: '2' })
  assert.deepEqual(parseQuery('?page=3'), { page: '3' })
})

test('collects repeated keys into arrays', () => {
  assert.deepEqual(parseQuery('a=1&a=2&a=3&b=x'), { a: ['1', '2', '3'], b: 'x' })
})

test('percent-decodes keys and values', () => {
  assert.deepEqual(parseQuery('full%20name=Jos%C3%A9&q=a%26b%3Dc'), {
    'full name': 'José',
    q: 'a&b=c',
  })
})

test('decodes + as a space but keeps encoded %2B as a literal plus', () => {
  assert.deepEqual(parseQuery('q=hello+world&lang=c%2B%2B'), {
    q: 'hello world',
    lang: 'c++',
  })
})

test('handles empty and missing values', () => {
  assert.deepEqual(parseQuery('a=&b&c=3'), { a: '', b: '', c: '3' })
  assert.deepEqual(parseQuery(''), {})
  assert.deepEqual(parseQuery('?'), {})
})

test('stringifies objects and arrays, encoding spaces as %20', () => {
  assert.equal(
    stringifyQuery({ q: 'hello world', tags: ['a', 'b'] }),
    'q=hello%20world&tags=a&tags=b',
  )
  assert.equal(stringifyQuery({ expr: '1+1=2&more' }), 'expr=1%2B1%3D2%26more')
})

test('roundtrips values containing spaces and ampersands', () => {
  const original = { title: 'war & peace', authors: ['leo t', 'someone else'] }
  assert.deepEqual(parseQuery(stringifyQuery(original)), original)
})
