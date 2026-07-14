export class LruCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('capacity must be a positive integer')
    }
    this.capacity = capacity
    this.entries = new Map()
  }

  get size() {
    return this.entries.size
  }

  has(key) {
    return this.entries.has(key)
  }

  get(key) {
    if (!this.entries.has(key)) return undefined
    return this.entries.get(key)
  }

  set(key, value) {
    if (this.entries.has(key)) {
      this.entries.delete(key)
    } else if (this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value
      this.entries.delete(oldest)
    }
    this.entries.set(key, value)
    return this
  }
}
