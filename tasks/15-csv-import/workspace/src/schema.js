const TRUE_WORDS = new Set(['true', '1', 'yes'])
const FALSE_WORDS = new Set(['false', '0', 'no'])
const INT_PATTERN = /^[+-]?\d+$/

export function defineSchema(columns) {
  return columns.map((column) => ({ nullable: false, ...column }))
}

export function coerceValue(raw, column) {
  if (raw === '' && column.nullable) {
    return { ok: true, value: null }
  }
  switch (column.type) {
    case 'string':
      return { ok: true, value: raw }
    case 'int': {
      if (!INT_PATTERN.test(raw.trim())) {
        return invalid(raw, column)
      }
      return { ok: true, value: Number.parseInt(raw.trim(), 10) }
    }
    case 'float': {
      const trimmed = raw.trim()
      if (trimmed === '' || Number.isNaN(Number(trimmed))) {
        return invalid(raw, column)
      }
      return { ok: true, value: Number(trimmed) }
    }
    case 'bool': {
      const word = raw.trim().toLowerCase()
      if (TRUE_WORDS.has(word)) {
        return { ok: true, value: true }
      }
      if (FALSE_WORDS.has(word)) {
        return { ok: true, value: false }
      }
      return invalid(raw, column)
    }
    default:
      return { ok: false, message: `unknown type "${column.type}" for column "${column.name}"` }
  }
}

function invalid(raw, column) {
  return { ok: false, message: `cannot coerce "${raw}" to ${column.type} for column "${column.name}"` }
}
