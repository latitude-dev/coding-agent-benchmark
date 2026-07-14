export function debounce(fn, waitMs, { scheduler }) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function')
  }
  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw new TypeError('waitMs must be a non-negative number')
  }

  let timerId = null
  let pendingArgs = null

  function fire() {
    timerId = null
    const args = pendingArgs
    pendingArgs = null
    fn(...args)
  }

  return function debounced(...args) {
    pendingArgs = pendingArgs ?? args
    if (timerId !== null) {
      scheduler.clearTimeout(timerId)
    }
    timerId = scheduler.setTimeout(fire, waitMs)
  }
}
