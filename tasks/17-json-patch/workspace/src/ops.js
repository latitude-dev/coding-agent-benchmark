import { parsePointer, resolveContainer, arrayIndex } from './pointer.js'

export function applyOp(doc, op) {
  switch (op.op) {
    case 'add':
      return add(doc, op.path, op.value)
    case 'replace':
      return replace(doc, op.path, op.value)
    case 'remove':
      return remove(doc, op.path)
    default:
      throw new Error(`unsupported op: ${op.op}`)
  }
}

function clone(node) {
  if (Array.isArray(node)) return node.slice()
  if (node !== null && typeof node === 'object') return { ...node }
  return node
}

function writePath(doc, tokens) {
  const copy = clone(doc)
  const { container, key } = resolveContainer(copy, tokens)
  return { copy, container, key }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function add(doc, path, value) {
  const tokens = parsePointer(path)
  if (tokens.length === 0) return value
  const { copy, container, key } = writePath(doc, tokens)
  if (Array.isArray(container)) {
    container.splice(arrayIndex(key, container.length, { allowEnd: true }), 0, value)
  } else if (isObject(container)) {
    container[key] = value
  } else {
    throw new Error(`path does not resolve to a container: ${path}`)
  }
  return copy
}

function replace(doc, path, value) {
  const tokens = parsePointer(path)
  if (tokens.length === 0) return value
  const { copy, container, key } = writePath(doc, tokens)
  if (Array.isArray(container)) {
    container[arrayIndex(key, container.length, { allowEnd: false })] = value
  } else if (isObject(container)) {
    if (!Object.hasOwn(container, key)) {
      throw new Error(`cannot replace missing key: ${key}`)
    }
    container[key] = value
  } else {
    throw new Error(`path does not resolve to a container: ${path}`)
  }
  return copy
}

function remove(doc, path) {
  const tokens = parsePointer(path)
  if (tokens.length === 0) {
    throw new Error('cannot remove the root document')
  }
  const { copy, container, key } = writePath(doc, tokens)
  if (Array.isArray(container)) {
    container.splice(arrayIndex(key, container.length, { allowEnd: false }), 1)
  } else if (isObject(container)) {
    if (!Object.hasOwn(container, key)) {
      throw new Error(`cannot remove missing key: ${key}`)
    }
    delete container[key]
  } else {
    throw new Error(`path does not resolve to a container: ${path}`)
  }
  return copy
}
