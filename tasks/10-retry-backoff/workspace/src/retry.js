const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function retry(fn, options = {}) {
  const {
    attempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 1000,
    sleep = defaultSleep,
  } = options

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError('attempts must be a positive integer')
  }
  if (baseDelayMs < 0 || maxDelayMs < baseDelayMs) {
    throw new RangeError('expected 0 <= baseDelayMs <= maxDelayMs')
  }

  let delay = baseDelayMs
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      await sleep(delay)
      delay = Math.min(delay, maxDelayMs) * 2
    }
  }

  throw lastError
}
