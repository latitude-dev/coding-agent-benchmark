export function parsePointer(pointer) {
  if (typeof pointer !== 'string') {
    throw new Error(`invalid JSON pointer: ${pointer}`)
  }
  if (pointer === '') return []
  if (!pointer.startsWith('/')) {
    throw new Error(`invalid JSON pointer: ${pointer}`)
  }
  return pointer.slice(1).split('/').map(unescapeToken)
}

function unescapeToken(token) {
  return token.replaceAll('~1', '/').replaceAll('~0', '~')
}

export function child(node, token) {
  if (Array.isArray(node)) {
    return node[arrayIndex(token, node.length, { allowEnd: false })]
  }
  if (node !== null && typeof node === 'object') {
    if (!Object.hasOwn(node, token)) {
      throw new Error(`missing key: ${token}`)
    }
    return node[token]
  }
  throw new Error(`cannot descend into a primitive at: ${token}`)
}

export function resolveContainer(node, tokens) {
  if (tokens.length === 0) {
    throw new Error('the root pointer has no containing value')
  }
  let container = node
  for (const token of tokens.slice(0, -1)) {
    container = child(container, token)
  }
  return { container, key: tokens[tokens.length - 1] }
}

export function arrayIndex(token, length, { allowEnd }) {
  if (token === '-') {
    if (!allowEnd) throw new Error('index - only points past the end')
    return length
  }
  if (!/^(0|[1-9]\d*)$/.test(token)) {
    throw new Error(`invalid array index: ${token}`)
  }
  const index = Number(token)
  const limit = allowEnd ? length : length - 1
  if (index > limit) {
    throw new Error(`array index out of bounds: ${token}`)
  }
  return index
}
