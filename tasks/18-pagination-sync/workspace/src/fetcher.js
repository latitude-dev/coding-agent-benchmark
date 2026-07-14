import { firstCursor, advanceCursor } from './cursor.js'

const MAX_REQUESTS = 10_000

/**
 * Walks every page of a collection through fetchPage(cursor) and
 * concatenates the items. fetchPage returns { items, done } and marks
 * the last page with done: true.
 */
export function fetchAllItems(fetchPage, { pageSize, sortKey }) {
  const items = []
  let cursor = firstCursor(pageSize, sortKey)
  for (let requests = 0; requests < MAX_REQUESTS; requests++) {
    const page = fetchPage(cursor)
    if (page === null || typeof page !== 'object') {
      throw new Error('page response is not an object')
    }
    if (!Array.isArray(page.items)) {
      throw new Error('page response has no items array')
    }
    items.push(...page.items)
    if (page.done || page.items.length === 0) return items
    cursor = advanceCursor(cursor, pageSize)
  }
  throw new Error('page limit exceeded without reaching the end')
}
