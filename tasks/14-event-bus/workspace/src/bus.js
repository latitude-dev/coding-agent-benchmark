export function createBus() {
  const channels = new Map()
  let nextSeq = 0

  function listenersFor(event) {
    let list = channels.get(event)
    if (list === undefined) {
      list = []
      channels.set(event, list)
    }
    return list
  }

  function subscribe(event, handler, { priority = 0 } = {}) {
    if (typeof event !== 'string' || event === '') {
      throw new TypeError('event must be a non-empty string')
    }
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function')
    }
    if (!Number.isFinite(priority)) {
      throw new RangeError('priority must be a finite number')
    }
    const entry = { handler, priority, seq: nextSeq++ }
    const list = listenersFor(event)
    list.push(entry)
    list.sort((a, b) => b.priority - a.priority || a.seq - b.seq)
    return function unsubscribe() {
      const current = channels.get(event)
      if (current === undefined) {
        return false
      }
      const index = current.indexOf(entry)
      if (index === -1) {
        return false
      }
      current.splice(index, 1)
      return true
    }
  }

  function emit(event, payload) {
    const list = channels.get(event)
    if (list === undefined || list.length === 0) {
      return 0
    }
    const snapshot = list.slice()
    for (const entry of snapshot) {
      entry.handler(payload)
    }
    return snapshot.length
  }

  function listenerCount(event) {
    const list = channels.get(event)
    return list === undefined ? 0 : list.length
  }

  function hasListeners(event) {
    return listenerCount(event) > 0
  }

  function clear(event) {
    if (event === undefined) {
      channels.clear()
      return
    }
    channels.delete(event)
  }

  return { subscribe, emit, listenerCount, hasListeners, clear }
}
