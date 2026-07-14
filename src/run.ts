import { appendFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { Latitude } from '@latitude-data/telemetry'
import { registerTelemetry } from 'ai'
import { OpenTelemetry } from '@ai-sdk/otel'
import { MODELS, resolveModels } from './models.ts'
import { runOne, type Task } from './agent.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const RESULTS_FILE = path.join(ROOT, 'results', 'results.jsonl')

async function loadTasks(filter?: string[]): Promise<Task[]> {
  const tasksRoot = path.join(ROOT, 'tasks')
  const dirs = (await readdir(tasksRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  const selected = filter?.length ? dirs.filter((d) => filter.includes(d)) : dirs
  if (filter?.length && selected.length !== filter.length) {
    const missing = filter.filter((f) => !dirs.includes(f))
    throw new Error(`Unknown tasks: ${missing.join(', ')}`)
  }
  return Promise.all(
    selected.map(async (id) => ({
      id,
      dir: path.join(tasksRoot, id),
      prompt: await readFile(path.join(tasksRoot, id, 'prompt.md'), 'utf8'),
    })),
  )
}

async function main() {
  const { values } = parseArgs({
    options: {
      models: { type: 'string', default: MODELS.filter((m) => m.provider !== 'mock').map((m) => m.key).join(',') },
      tasks: { type: 'string' },
      trials: { type: 'string', default: '3' },
      concurrency: { type: 'string', default: '3' },
      blind: { type: 'boolean', default: false },
    },
  })
  const mode = values.blind ? ('blind' as const) : ('oracle' as const)

  const specs = resolveModels(values.models.split(',').map((s) => s.trim()))
  const tasks = await loadTasks(values.tasks?.split(',').map((s) => s.trim()))
  const trials = Number(values.trials)
  const concurrency = Number(values.concurrency)

  if (!process.env.LATITUDE_API_KEY) throw new Error('LATITUDE_API_KEY is required')
  const latitude = new Latitude({
    apiKey: process.env.LATITUDE_API_KEY,
    project: process.env.LATITUDE_PROJECT_SLUG ?? 'model-benchmark',
  })
  registerTelemetry(new OpenTelemetry())

  const queue: Array<{ specIndex: number; task: Task; trial: number }> = []
  for (const task of tasks) {
    for (let trial = 1; trial <= trials; trial++) {
      for (let specIndex = 0; specIndex < specs.length; specIndex++) {
        queue.push({ specIndex, task, trial })
      }
    }
  }

  console.log(
    `Running ${queue.length} runs: ${specs.length} models x ${tasks.length} tasks x ${trials} trials (concurrency ${concurrency})`,
  )
  await mkdir(path.dirname(RESULTS_FILE), { recursive: true })

  let completed = 0
  let cursor = 0
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++]
      const spec = specs[item.specIndex]
      const runId = randomUUID()
      const result = await runOne(spec, item.task, item.trial, runId, mode)
      await appendFile(RESULTS_FILE, JSON.stringify(result) + '\n')
      completed++
      const flag = result.status !== 'ok' ? ` ERROR(${result.error})` : result.solved ? ' solved' : ' unsolved'
      console.log(
        `[${completed}/${queue.length}] ${spec.key} ${item.task.id} t${item.trial}:${flag} ` +
          `${(result.wallMs / 1000).toFixed(1)}s $${result.costUsd.toFixed(4)} ${result.toolCalls} calls`,
      )
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  await latitude.shutdown()
  console.log(`Done. Results appended to ${path.relative(process.cwd(), RESULTS_FILE)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
