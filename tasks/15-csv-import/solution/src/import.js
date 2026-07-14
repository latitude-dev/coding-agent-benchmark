import { parseCsv } from './parse.js'
import { coerceValue } from './schema.js'

export function importCsv(text, schema) {
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return { records: [], errors: [] }
  }

  const header = rows[0]
  const columns = header.map((name) => {
    const column = schema.find((candidate) => candidate.name === name)
    if (!column) {
      throw new Error(`column "${name}" is not defined in the schema`)
    }
    return column
  })

  const records = []
  const errors = []
  rows.slice(1).forEach((cells, index) => {
    const line = index + 2
    if (cells.length !== columns.length) {
      errors.push({
        line,
        column: null,
        message: `expected ${columns.length} fields, got ${cells.length}`,
      })
      return
    }
    const record = {}
    let failed = false
    columns.forEach((column, position) => {
      const result = coerceValue(cells[position], column)
      if (result.ok) {
        record[column.name] = result.value
      } else {
        failed = true
        errors.push({ line, column: column.name, message: result.message })
      }
    })
    if (!failed) {
      records.push(record)
    }
  })

  return { records, errors }
}
