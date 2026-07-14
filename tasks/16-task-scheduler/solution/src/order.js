import { buildGraph, findCycle } from './graph.js'

export function planOrder(tasks) {
  const graph = buildGraph(tasks)
  const cycle = findCycle(graph)
  if (cycle) {
    throw new Error(`dependency cycle: ${cycle.join(' -> ')}`)
  }

  const remaining = new Map(graph.indegree)
  const ready = [...graph.nodes.values()].filter(
    (node) => remaining.get(node.name) === 0,
  )

  const order = []
  while (ready.length > 0) {
    ready.sort(byPriority)
    const { name } = ready.shift()
    order.push(name)
    for (const next of graph.dependents.get(name)) {
      const left = remaining.get(next) - 1
      remaining.set(next, left)
      if (left === 0) ready.push(graph.nodes.get(next))
    }
  }
  return order
}

function byPriority(a, b) {
  if (a.priority !== b.priority) return b.priority - a.priority
  return a.name < b.name ? -1 : 1
}
