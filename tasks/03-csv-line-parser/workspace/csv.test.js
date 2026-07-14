import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsvLine } from './src/csv.js'

test('splits plain fields on commas', () => {
  assert.deepEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c'])
})

test('keeps commas inside a quoted field', () => {
  assert.deepEqual(parseCsvLine('"a, b",c'), ['a, b', 'c'])
})

test('unescapes doubled quotes inside a quoted field', () => {
  assert.deepEqual(parseCsvLine('a,"b""c",d'), ['a', 'b"c', 'd'])
})

test('keeps a comma that follows an escaped quote inside a quoted field', () => {
  assert.deepEqual(parseCsvLine('"say ""hi"", please",ok'), ['say "hi", please', 'ok'])
})

test('handles consecutive escaped quotes', () => {
  assert.deepEqual(parseCsvLine('"""""",x'), ['""', 'x'])
})

test('preserves empty fields', () => {
  assert.deepEqual(parseCsvLine('a,,c'), ['a', '', 'c'])
  assert.deepEqual(parseCsvLine(',a,'), ['', 'a', ''])
})

test('parses a quoted empty string as an empty field', () => {
  assert.deepEqual(parseCsvLine('"",a'), ['', 'a'])
})

test('preserves whitespace-only fields', () => {
  assert.deepEqual(parseCsvLine('  ,"  ",x'), ['  ', '  ', 'x'])
})
