export function encodeCursor({ offset, pageSize, sortKey }) {
  assertCursorFields(offset, pageSize, sortKey)
  const payload = JSON.stringify({ o: offset, p: pageSize, k: sortKey })
  return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeCursor(cursor) {
  if (typeof cursor !== 'string' || cursor === '') {
    throw new Error('malformed cursor')
  }
  let payload
  try {
    payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw new Error('malformed cursor')
  }
  if (payload === null || typeof payload !== 'object') {
    throw new Error('malformed cursor')
  }
  const { o: offset, p: pageSize, k: sortKey } = payload
  assertCursorFields(offset, pageSize, sortKey)
  return { offset, pageSize, sortKey }
}

export function firstCursor(pageSize, sortKey) {
  return encodeCursor({ offset: 0, pageSize, sortKey })
}

export function advanceCursor(cursor, count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`invalid cursor advance: ${count}`)
  }
  const { offset, pageSize, sortKey } = decodeCursor(cursor)
  return encodeCursor({ offset: offset + count, pageSize, sortKey })
}

function assertCursorFields(offset, pageSize, sortKey) {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`invalid cursor offset: ${offset}`)
  }
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error(`invalid cursor page size: ${pageSize}`)
  }
  if (typeof sortKey !== 'string' || sortKey === '') {
    throw new Error(`invalid cursor sort key: ${sortKey}`)
  }
}
