import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { RunResult } from './agent.ts'

const RESULTS_FILE = path.resolve(import.meta.dirname, '..', 'results', 'results.jsonl')

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function main() {
  const lines = (await readFile(RESULTS_FILE, 'utf8')).trim().split('\n')
  const results: RunResult[] = lines.map((l) => JSON.parse(l))

  const tierOf = (r: RunResult) =>
    r.mode === 'blind' ? 'blind' : Number(r.task.slice(0, 2)) <= 12 ? 'easy' : 'hard'

  for (const tier of ['easy', 'hard', 'blind']) {
    const inTier = results.filter((r) => r.status === 'ok' && tierOf(r) === tier)
    if (inTier.length === 0) continue

    const byModel = new Map<string, RunResult[]>()
    for (const r of inTier) {
      byModel.set(r.model, [...(byModel.get(r.model) ?? []), r])
    }

    const rows = []
    for (const [model, runs] of byModel) {
      const attempted = runs.filter((r) => r.finishReason !== 'content-filter')
      const refused = runs.length - attempted.length
      const solved = attempted.filter((r) => r.solved)
      const totalCost = runs.reduce((sum, r) => sum + r.costUsd, 0)
      const totalCalls = attempted.reduce((sum, r) => sum + r.toolCalls, 0)
      const totalToolErrors = attempted.reduce((sum, r) => sum + r.toolErrors + r.malformedCalls, 0)
      rows.push({
        model,
        runs: runs.length,
        refused,
        solveRate: attempted.length ? `${((solved.length / attempted.length) * 100).toFixed(0)}%` : 'n/a',
        costPerSolved: solved.length ? `$${(totalCost / solved.length).toFixed(3)}` : 'n/a',
        totalCost: `$${totalCost.toFixed(2)}`,
        medianWallS: attempted.length ? (median(attempted.map((r) => r.wallMs)) / 1000).toFixed(1) : 'n/a',
        medianSteps: attempted.length ? median(attempted.map((r) => r.steps)).toFixed(0) : 'n/a',
        toolErrorRate: totalCalls ? `${((totalToolErrors / totalCalls) * 100).toFixed(1)}%` : 'n/a',
        tampered: attempted.filter((r) => r.tamper).length,
      })
    }

    console.log(`\n=== ${tier.toUpperCase()} tier`)
    console.table(rows.sort((a, b) => a.model.localeCompare(b.model)))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
