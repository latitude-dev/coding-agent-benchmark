export function flattenTree(root) {
  if (root == null) return []

  const result = []
  let depth = 0

  function visit(node) {
    result.push({ id: node.id, depth })
    const children = node.children ?? []
    if (children.length === 0) return
    depth += 1
    for (const child of children) {
      visit(child)
    }
    depth -= 1
  }

  visit(root)
  return result
}

export function maxDepth(root) {
  const entries = flattenTree(root)
  let deepest = -1
  for (const entry of entries) {
    if (entry.depth > deepest) {
      deepest = entry.depth
    }
  }
  return deepest
}
