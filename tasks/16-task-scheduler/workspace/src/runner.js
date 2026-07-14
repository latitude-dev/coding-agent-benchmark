import { planOrder } from './order.js'

/**
 * Runs tasks sequentially in the order given by planOrder, which puts
 * dependencies first and, among tasks that are ready at the same time,
 * the highest priority next (ties break alphabetically by name). A task
 * whose dependency failed or was skipped is itself skipped, and the log
 * records every task at the position the plan gave it.
 */
export function runTasks(tasks, execute) {
  const byName = new Map(tasks.map((task) => [task.name, task]))
  const order = planOrder(tasks)
  const status = new Map()
  const log = []

  for (const name of order) {
    const task = byName.get(name)
    const blockedBy = (task.dependsOn ?? []).find(
      (dep) => status.get(dep) !== 'ok',
    )
    if (blockedBy !== undefined) {
      status.set(name, 'skipped')
      log.push({ name, status: 'skipped', blockedBy })
      continue
    }

    try {
      execute(task)
      status.set(name, 'ok')
      log.push({ name, status: 'ok' })
    } catch (error) {
      status.set(name, 'failed')
      log.push({ name, status: 'failed', error: error.message })
    }
  }

  return { order, log, status }
}
