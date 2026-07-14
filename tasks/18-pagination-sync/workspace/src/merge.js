import { fetchAllItems } from './fetcher.js'

/**
 * Merges freshly fetched items into a cached list keyed by id. Fetched
 * pages may be short or overlap earlier ones; ids deduplicate overlaps
 * and the freshest copy wins. The result is sorted by sortKey, with
 * ties broken by id.
 */
export function mergeItems(cached, fetched, sortKey) {
  const byId = indexById(cached)
  for (const item of fetched) {
    byId.set(item.id, item)
  }
  return [...byId.values()].sort(compareBy(sortKey))
}

export function indexById(items) {
  const byId = new Map()
  for (const item of items) {
    byId.set(item.id, item)
  }
  return byId
}

export function syncCollection(cached, fetchPage, { pageSize, sortKey }) {
  const fetched = fetchAllItems(fetchPage, { pageSize, sortKey })
  const cachedIds = indexById(cached)
  const counted = new Set()
  let added = 0
  let updated = 0
  for (const item of fetched) {
    if (counted.has(item.id)) continue
    counted.add(item.id)
    if (cachedIds.has(item.id)) {
      updated += 1
    } else {
      added += 1
    }
  }
  return { items: mergeItems(cached, fetched, sortKey), added, updated }
}

function compareBy(sortKey) {
  return (a, b) => {
    if (a[sortKey] < b[sortKey]) return -1
    if (a[sortKey] > b[sortKey]) return 1
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  }
}
