import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv } from './src/parse.js'
import { defineSchema } from './src/schema.js'
import { importCsv } from './src/import.js'

const schema = defineSchema([
  { name: 'id', type: 'int' },
  { name: 'name', type: 'string' },
  { name: 'score', type: 'float' },
  { name: 'active', type: 'bool' },
  { name: 'nickname', type: 'string', nullable: true },
])

const HEADER = 'id,name,score,active,nickname'

test('imports clean rows with type coercion', () => {
  const text = [HEADER, '1,Ann,9.5,true,Annie', '2,Bob,7,false,Bobby'].join('\n')
  assert.deepEqual(importCsv(text, schema), {
    records: [
      { id: 1, name: 'Ann', score: 9.5, active: true, nickname: 'Annie' },
      { id: 2, name: 'Bob', score: 7, active: false, nickname: 'Bobby' },
    ],
    errors: [],
  })
})

test('empty value in a nullable column becomes null', () => {
  const text = [HEADER, '3,Cal,5.5,yes,'].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.deepEqual(errors, [])
  assert.deepEqual(records, [{ id: 3, name: 'Cal', score: 5.5, active: true, nickname: null }])
})

test('accepts the documented bool spellings', () => {
  const words = ['true', '1', 'yes', 'false', '0', 'no']
  const lines = words.map((word, i) => `${i + 1},P${i},1.0,${word},`)
  const { records, errors } = importCsv([HEADER, ...lines].join('\n'), schema)
  assert.deepEqual(errors, [])
  assert.deepEqual(
    records.map((record) => record.active),
    [true, true, true, false, false, false],
  )
})

test('quoted fields keep embedded commas', () => {
  const text = [HEADER, '4,"Doe, Jane",8.25,no,'].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.deepEqual(errors, [])
  assert.equal(records[0].name, 'Doe, Jane')
})

test('doubled quotes decode to a literal quote', () => {
  const text = [HEADER, '5,"say ""hi""",6.5,yes,'].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.deepEqual(errors, [])
  assert.equal(records[0].name, 'say "hi"')
})

test('a bad row reports the file line it came from', () => {
  const text = [HEADER, '1,Ann,9.5,true,', '2,Bob,8.5,false,', 'oops,Cara,7.5,true,'].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.equal(records.length, 2)
  assert.deepEqual(errors, [
    { line: 4, column: 'id', message: 'cannot coerce "oops" to int for column "id"' },
  ])
})

test('multiple bad rows each report their own file line', () => {
  const text = [
    HEADER,
    '1,Ann,9.5,maybe,',
    '2,Bob,8.5,false,',
    '3,Cal,7.5,true,',
    'oops,Dee,6.5,no,',
  ].join('\n')
  const { errors } = importCsv(text, schema)
  assert.deepEqual(
    errors.map((error) => error.line),
    [2, 5],
  )
})

test('good rows still import when other rows fail', () => {
  const text = [
    HEADER,
    '1,Ann,9.5,maybe,',
    '2,Bob,8.5,false,',
    '3,Cal,7.5,true,',
    'oops,Dee,6.5,no,',
  ].join('\n')
  const { records } = importCsv(text, schema)
  assert.deepEqual(records, [
    { id: 2, name: 'Bob', score: 8.5, active: false, nickname: null },
    { id: 3, name: 'Cal', score: 7.5, active: true, nickname: null },
  ])
})

test('a row with the wrong field count is rejected with a clear message', () => {
  const text = [HEADER, '1,Ann,9.5'].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.deepEqual(records, [])
  assert.equal(errors.length, 1)
  assert.equal(errors[0].column, null)
  assert.equal(errors[0].message, 'expected 5 fields, got 3')
})

test('a file with only a header imports nothing without errors', () => {
  assert.deepEqual(importCsv(`${HEADER}\n`, schema), { records: [], errors: [] })
  assert.deepEqual(importCsv('', schema), { records: [], errors: [] })
})

test('string fields preserve surrounding whitespace', () => {
  const text = [HEADER, '7,  Ann Lee ,1.0,true,  nick '].join('\n')
  const { records, errors } = importCsv(text, schema)
  assert.deepEqual(errors, [])
  assert.equal(records[0].name, '  Ann Lee ')
  assert.equal(records[0].nickname, '  nick ')
})

test('parseCsv splits quoted lines and drops a trailing newline', () => {
  assert.deepEqual(parseCsv('a,b\n"c,d",e\n'), [
    ['a', 'b'],
    ['c,d', 'e'],
  ])
})
