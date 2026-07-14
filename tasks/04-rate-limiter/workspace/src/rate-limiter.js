export class SlidingWindowRateLimiter {
  constructor({ limit, windowMs }) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('limit must be a positive integer')
    }
    if (!Number.isInteger(windowMs) || windowMs < 1) {
      throw new RangeError('windowMs must be a positive integer')
    }
    this.limit = limit
    this.windowMs = windowMs
    this.timestamps = []
  }

  get pending() {
    return this.timestamps.length
  }

  allow(timestampMs) {
    if (!Number.isFinite(timestampMs)) {
      throw new RangeError('timestampMs must be a finite number')
    }
    const cutoff = timestampMs - this.windowMs
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift()
    }
    if (this.timestamps.length >= this.limit) return false
    this.timestamps.push(timestampMs)
    return true
  }
}
