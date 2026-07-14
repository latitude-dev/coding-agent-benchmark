export function once(bus, event, handler, options) {
  const unsubscribe = bus.subscribe(
    event,
    (payload) => {
      unsubscribe()
      handler(payload)
    },
    options,
  )
  return unsubscribe
}

export function oncePromise(bus, event, options) {
  return new Promise((resolve) => {
    once(bus, event, resolve, options)
  })
}
