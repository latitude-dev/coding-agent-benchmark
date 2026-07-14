import { buildGraph, findCycle } from './graph.js'

export function planOrder(tasks) {
  const graph = buildGraph(tasks)
  const cycle = findCycle(graph)
  if (cycle) {
    throw new Error(`dependency cycle: ${cycle.join(' -> ')}`)
  }

  const ranked = [...graph.nodes.values()].sort(byPriority)
  const remaining = new Map(graph.indegree)
  const queue = ranked
    .filter((node) => remaining.get(node.name) === 0)
    .map((node) => node.name)

  const order = []
  while (queue.length > 0) {
    const name = queue.shift()
    order.push(name)
    for (const next of graph.dependents.get(name)) {
      const left = remaining.get(next) - 1
      remaining.set(next, left)
      if (left === 0) queue.push(next)
    }
  }
  return order
}

function byPriority(a, b) {
  if (a.priority !== b.priority) return b.priority - a.priority
  return a.name < b.name ? -1 : 1
}
