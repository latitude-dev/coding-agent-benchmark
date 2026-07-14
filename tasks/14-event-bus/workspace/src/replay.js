export function withReplay(bus, event, { limit = Infinity } = {}) {
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) {
    throw new RangeError('limit must be a positive integer')
  }
  const buffer = []
  const stopRecording = bus.subscribe(event, (payload) => {
    buffer.push(payload)
    if (buffer.length > limit) {
      buffer.shift()
    }
  })

  function subscribe(handler, options) {
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function')
    }
    for (const payload of buffer.slice()) {
      handler(payload)
    }
    return bus.subscribe(event, handler, options)
  }

  function buffered() {
    return buffer.slice()
  }

  function flush() {
    buffer.length = 0
  }

  return { subscribe, buffered, flush, stop: stopRecording }
}
