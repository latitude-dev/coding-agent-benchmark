export function buildGraph(tasks) {
  const nodes = new Map()
  for (const task of tasks) {
    if (nodes.has(task.name)) {
      throw new Error(`duplicate task: ${task.name}`)
    }
    nodes.set(task.name, {
      name: task.name,
      priority: task.priority ?? 0,
      dependsOn: [...(task.dependsOn ?? [])],
    })
  }

  for (const node of nodes.values()) {
    for (const dep of node.dependsOn) {
      if (!nodes.has(dep)) {
        throw new Error(`task ${node.name} depends on unknown task: ${dep}`)
      }
    }
  }

  const names = [...nodes.keys()].sort()
  const dependents = new Map(names.map((name) => [name, []]))
  const indegree = new Map(names.map((name) => [name, 0]))
  for (const name of names) {
    for (const dep of nodes.get(name).dependsOn) {
      dependents.get(dep).push(name)
      indegree.set(name, indegree.get(name) + 1)
    }
  }

  return { nodes, dependents, indegree }
}

export function findCycle(graph) {
  const state = new Map()
  const stack = []

  function visit(name) {
    state.set(name, 'visiting')
    stack.push(name)
    for (const next of graph.dependents.get(name)) {
      const seen = state.get(next)
      if (seen === 'visiting') {
        return [...stack.slice(stack.indexOf(next)), next]
      }
      if (seen === undefined) {
        const cycle = visit(next)
        if (cycle) return cycle
      }
    }
    stack.pop()
    state.set(name, 'done')
    return null
  }

  for (const name of graph.nodes.keys()) {
    if (!state.has(name)) {
      const cycle = visit(name)
      if (cycle) return cycle
    }
  }
  return null
}
