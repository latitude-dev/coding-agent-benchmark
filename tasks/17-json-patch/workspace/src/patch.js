import { applyOp } from './ops.js'

export class PatchError extends Error {
  constructor(message, index) {
    super(message)
    this.name = 'PatchError'
    this.index = index
  }
}

/**
 * Applies a list of operations atomically. Each applyOp call returns a
 * fresh document and leaves its input alone, so when an operation fails
 * partway through the list, throwing is enough of a rollback: the
 * caller's document stays exactly as it was.
 */
export function applyPatch(doc, ops) {
  let current = doc
  for (const [index, op] of ops.entries()) {
    try {
      current = applyOp(current, op)
    } catch (error) {
      throw new PatchError(
        `op ${index} (${op.op} ${op.path}) failed: ${error.message}`,
        index,
      )
    }
  }
  return current
}
