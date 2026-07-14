export function once(bus, event, handler, options) {
  let fired = false
  const unsubscribe = bus.subscribe(
    event,
    (payload) => {
      if (fired) {
        return
      }
      fired = true
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
