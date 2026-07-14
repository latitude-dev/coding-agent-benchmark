import { access, cp, readdir } from 'node:fs/promises'
import path from 'node:path'
import { Sandbox } from './sandbox.ts'

const TASKS_ROOT = path.resolve(import.meta.dirname, '..', 'tasks')

// A valid task must fail its tests as shipped and pass them with the reference solution applied.
async function validateTask(id: string): Promise<string[]> {
  const problems: string[] = []
  const dir = path.join(TASKS_ROOT, id)

  for (const required of ['prompt.md', 'workspace', 'solution']) {
    try {
      await access(path.join(dir, required))
    } catch {
      problems.push(`missing ${required}`)
    }
  }
  if (problems.length) return problems

  const buggy = await Sandbox.create(dir)
  try {
    const outcome = await buggy.runTests()
    if (outcome.passed) problems.push('tests PASS on the buggy workspace (no bug to fix)')
  } finally {
    await buggy.destroy()
  }

  const fixed = await Sandbox.create(dir)
  try {
    await cp(path.join(dir, 'solution'), fixed.root, { recursive: true })
    const outcome = await fixed.runTests()
    if (!outcome.passed) {
      problems.push(`tests FAIL with the reference solution applied:\n${outcome.summary}`)
    }
  } finally {
    await fixed.destroy()
  }

  return problems
}

async function main() {
  const ids = (await readdir(TASKS_ROOT, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

  if (ids.length === 0) {
    console.error('No tasks found')
    process.exit(1)
  }

  let failed = 0
  for (const id of ids) {
    const problems = await validateTask(id)
    if (problems.length === 0) {
      console.log(`ok   ${id}`)
    } else {
      failed++
      console.log(`FAIL ${id}\n  - ${problems.join('\n  - ')}`)
    }
  }

  console.log(`\n${ids.length - failed}/${ids.length} tasks valid`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
