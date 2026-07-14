import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { RunResult } from './agent.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const RESULTS_FILE = path.join(ROOT, 'results', 'results.jsonl')
const PUSHED_FILE = path.join(ROOT, 'results', 'scores-pushed.txt')
const API_BASE = process.env.LATITUDE_API_BASE ?? 'https://api.latitude.so/v1'
const PROJECT = process.env.LATITUDE_PROJECT_SLUG ?? 'model-benchmark'
const SOURCE_ID = 'benchmark-harness'

async function post(pathname: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE}/projects/${PROJECT}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LATITUDE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function traceTarget(run: RunResult) {
  if (run.traceId) return { by: 'id', id: run.traceId }
  return { by: 'filters', filters: { sessionId: [{ op: 'eq', value: run.runId }] } }
}

function feedbackFor(run: RunResult): string {
  const mode = run.mode ?? 'oracle'
  if (run.solved) {
    return `Hidden suite passed for ${run.task} (${mode} mode) in ${run.steps} steps, ${run.toolCalls} tool calls, $${run.costUsd.toFixed(4)}.`
  }
  const reasons = [
    run.tamper ? 'wrote to test files' : null,
    run.toolErrors ? `${run.toolErrors} tool errors` : null,
    run.finishReason === 'tool-calls' ? 'hit the step cap' : null,
  ].filter(Boolean)
  return `Hidden suite failed for ${run.task} (${mode} mode)${reasons.length ? `: ${reasons.join(', ')}` : ''}. Finish reason: ${run.finishReason}.`
}

async function main() {
  if (!process.env.LATITUDE_API_KEY) throw new Error('LATITUDE_API_KEY is required')
  const runs: RunResult[] = (await readFile(RESULTS_FILE, 'utf8'))
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
  const pushed = new Set(
    await readFile(PUSHED_FILE, 'utf8').then((c) => c.trim().split('\n'), () => [] as string[]),
  )

  let ok = 0
  let failed = 0
  for (const run of runs) {
    if (run.status !== 'ok' || pushed.has(run.runId)) continue

    const score = await post('/scores', {
      value: run.solved ? 1 : 0,
      passed: run.solved,
      feedback: feedbackFor(run),
      trace: traceTarget(run),
      sourceId: SOURCE_ID,
      metadata: {
        task: run.task,
        model: run.model,
        trial: run.trial,
        mode: run.mode ?? 'oracle',
        tamper: run.tamper,
        toolErrors: run.toolErrors,
        malformedCalls: run.malformedCalls,
        wallMs: run.wallMs,
        costUsd: run.costUsd,
      },
    })
    if (!score.ok) {
      failed++
      console.error(`score ${run.model}/${run.task}/t${run.trial}: ${score.status} ${await score.text()}`)
      continue
    }

    if (!run.solved) {
      const annotation = await post('/annotations', {
        value: 0,
        passed: false,
        feedback: feedbackFor(run),
        trace: traceTarget(run),
      })
      if (!annotation.ok) {
        failed++
        console.error(
          `annotation ${run.model}/${run.task}/t${run.trial}: ${annotation.status} ${await annotation.text()}`,
        )
        continue
      }
    }

    await appendFile(PUSHED_FILE, run.runId + '\n')
    pushed.add(run.runId)
    ok++
  }
  console.log(`Pushed ${ok} scores (${failed} failures, ${pushed.size} total pushed)`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
