// Rebuilds the per-tier, per-model cost tables using Latitude's per-trace cost as
// the source of truth (joined to local run records by sessionId == runId).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { RunResult } from './agent.ts'

const API_BASE = process.env.LATITUDE_API_BASE ?? 'https://api.latitude.so/v1'
const PROJECT = process.env.LATITUDE_PROJECT_SLUG ?? 'model-benchmark'
const RESULTS_FILE = path.resolve(import.meta.dirname, '..', 'results', 'results.jsonl')

type TraceRow = { sessionId: string | null; costTotalMicrocents: number }

async function allTraceCosts(): Promise<Map<string, number>> {
  const costBySession = new Map<string, number>()
  let cursor: string | undefined
  for (;;) {
    const res = await fetch(`${API_BASE}/projects/${PROJECT}/traces/list`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LATITUDE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 200, ...(cursor ? { cursor } : {}) }),
    })
    if (!res.ok) throw new Error(`traces list ${res.status}: ${await res.text()}`)
    const page = (await res.json()) as { items: TraceRow[]; nextCursor: string | null }
    for (const row of page.items) {
      if (row.sessionId) costBySession.set(row.sessionId, row.costTotalMicrocents / 100_000_000)
    }
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return costBySession
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

async function main() {
  const cost = await allTraceCosts()
  const runs: RunResult[] = (await readFile(RESULTS_FILE, 'utf8'))
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
    .filter((r: RunResult) => r.status === 'ok')

  const matched = runs.filter((r) => cost.has(r.runId))
  console.log(`joined ${matched.length}/${runs.length} runs to a Latitude trace cost\n`)

  const tierOf = (r: RunResult) =>
    r.mode === 'blind' ? 'blind' : Number(r.task.slice(0, 2)) <= 12 ? 'easy' : 'hard'
  const models = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-5', 'gpt-5.5', 'gpt-5.3-codex']

  for (const tier of ['easy', 'hard', 'blind']) {
    console.log(`=== ${tier} (Latitude cost)`)
    for (const m of models) {
      const rs = matched.filter((r) => r.model === m && tierOf(r) === tier)
      if (rs.length === 0) continue
      const attempted = rs.filter((r) => r.finishReason !== 'content-filter')
      const solved = attempted.filter((r) => r.solved)
      const total = rs.reduce((sum, r) => sum + (cost.get(r.runId) ?? 0), 0)
      const perSolved = solved.length ? `$${(total / solved.length).toFixed(3)}` : 'n/a'
      const medS = attempted.length ? (median(attempted.map((r) => r.wallMs)) / 1000).toFixed(1) : 'n/a'
      console.log(
        `${m.padEnd(18)} solved ${solved.length}/${attempted.length}  cost/solved ${perSolved}  total $${total.toFixed(2)}  median ${medS}s`,
      )
    }
    console.log()
  }

  const grand = matched.reduce((sum, r) => sum + (cost.get(r.runId) ?? 0), 0)
  console.log(`grand total (Latitude): $${grand.toFixed(2)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
