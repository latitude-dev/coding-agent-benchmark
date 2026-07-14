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

  const byModel = new Map<string, RunResult[]>()
  for (const r of results) {
    byModel.set(r.model, [...(byModel.get(r.model) ?? []), r])
  }

  const rows = []
  for (const [model, runs] of byModel) {
    const ok = runs.filter((r) => r.status === 'ok')
    const errored = runs.length - ok.length
    const solved = ok.filter((r) => r.solved)
    const totalCost = ok.reduce((sum, r) => sum + r.costUsd, 0)
    const totalCalls = ok.reduce((sum, r) => sum + r.toolCalls, 0)
    const totalToolErrors = ok.reduce((sum, r) => sum + r.toolErrors + r.malformedCalls, 0)
    rows.push({
      model,
      runs: ok.length,
      errored,
      solveRate: ok.length ? `${((solved.length / ok.length) * 100).toFixed(0)}%` : 'n/a',
      costPerSolved: solved.length ? `$${(totalCost / solved.length).toFixed(3)}` : 'n/a',
      totalCost: `$${totalCost.toFixed(2)}`,
      medianWallS: (median(ok.map((r) => r.wallMs)) / 1000).toFixed(1),
      medianFirstActionS: (median(ok.filter((r) => r.firstActionMs !== null).map((r) => r.firstActionMs!)) / 1000).toFixed(1),
      medianSteps: median(ok.map((r) => r.steps)).toFixed(0),
      toolErrorRate: totalCalls ? `${((totalToolErrors / totalCalls) * 100).toFixed(1)}%` : 'n/a',
      tampered: ok.filter((r) => r.tamper).length,
    })
  }

  console.table(rows)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
