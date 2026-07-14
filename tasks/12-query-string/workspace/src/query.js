function decode(part) {
  return decodeURIComponent(part)
}

export function parseQuery(qs) {
  const input = qs.startsWith('?') ? qs.slice(1) : qs
  const result = {}
  if (input === '') return result

  for (const pair of input.split('&')) {
    if (pair === '') continue

    const eq = pair.indexOf('=')
    const key = decode(eq === -1 ? pair : pair.slice(0, eq))
    const value = decode(eq === -1 ? '' : pair.slice(eq + 1))

    if (Object.hasOwn(result, key)) {
      if (Array.isArray(result[key])) {
        result[key].push(value)
      } else {
        result[key] = [result[key], value]
      }
    } else {
      result[key] = value
    }
  }

  return result
}

export function stringifyQuery(obj) {
  const pairs = []

  for (const [key, value] of Object.entries(obj)) {
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
    }
  }

  return pairs.join('&')
}
