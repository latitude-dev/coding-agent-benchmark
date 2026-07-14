import { generateText, stepCountIs } from 'ai'
import { trace } from '@opentelemetry/api'
import { capture } from '@latitude-data/telemetry'
import { Sandbox } from './sandbox.ts'
import { createTools } from './tools.ts'
import { computeCostUsd, type ModelSpec } from './models.ts'

export type Task = {
  id: string
  dir: string
  prompt: string
}

export type RunResult = {
  runId: string
  finishedAt: string
  model: string
  task: string
  trial: number
  status: 'ok' | 'agent_error'
  traceId: string | null
  solved: boolean
  tamper: boolean
  steps: number
  toolCalls: number
  toolErrors: number
  malformedCalls: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
  wallMs: number
  firstActionMs: number | null
  finishReason: string
  error?: string
}

const INSTRUCTIONS = `You are a coding agent working in a small JavaScript project.
The project has a test suite that currently fails because of a bug in the source code.
Your job is to find the bug and fix it so that every test passes.

Rules:
- Explore with list_files and read_file before changing anything.
- Fix the source code. Do not modify test files; they define the expected behavior.
- Use run_tests to check your work. Keep going until all tests pass or you are certain you cannot fix it.
- When the tests pass, reply with a one-paragraph summary of the bug and your fix.`

function tokenCount(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'total' in value) {
    return (value as { total?: number }).total ?? 0
  }
  return 0
}

// AI SDK v7 totalUsage reports cache reads under inputTokenDetails, not cachedInputTokens.
function cachedTokenCount(usage: Record<string, unknown>): number {
  const details = usage.inputTokenDetails
  if (details && typeof details === 'object' && 'cacheReadTokens' in details) {
    return (details as { cacheReadTokens?: number }).cacheReadTokens ?? 0
  }
  return tokenCount(usage.cachedInputTokens)
}

function countMalformedCalls(steps: unknown[]): number {
  let malformed = 0
  for (const step of steps) {
    const content = (step as { content?: unknown[] }).content ?? []
    for (const part of content) {
      const p = part as { type?: string; invalid?: boolean; error?: { name?: string } }
      if (p.type === 'tool-call' && p.invalid === true) malformed++
      if (p.type === 'tool-error' && /InvalidToolInput|NoSuchTool/.test(p.error?.name ?? '')) {
        malformed++
      }
    }
  }
  return malformed
}

export async function runOne(
  spec: ModelSpec,
  task: Task,
  trial: number,
  runId: string,
): Promise<RunResult> {
  const sandbox = await Sandbox.create(task.dir)
  const { tools, stats } = createTools(sandbox)
  const startedAt = Date.now()
  let firstActionMs: number | null = null
  let traceId: string | null = null

  const base = {
    runId,
    model: spec.key,
    task: task.id,
    trial,
  }

  try {
    const result = await capture(
      `fix:${task.id}`,
      () => {
        traceId = trace.getActiveSpan()?.spanContext().traceId ?? null
        return generateText({
          model: spec.model(),
          instructions: INSTRUCTIONS,
          prompt: task.prompt,
          tools,
          stopWhen: stepCountIs(24),
          onStepFinish: (step) => {
            if (firstActionMs === null && step.toolCalls.length > 0) {
              firstActionMs = Date.now() - startedAt
            }
          },
        })
      },
      {
        metadata: { ...base, benchmark: 'coding-agent-v1' },
        tags: [`model:${spec.key}`, `task:${task.id}`, `trial:${trial}`, 'coding-benchmark'],
        sessionId: runId,
        userId: spec.key,
      },
    )

    const wallMs = Date.now() - startedAt
    const verification = await sandbox.verify()
    const usage = result.totalUsage as Record<string, unknown>
    const inputTokens = tokenCount(usage.inputTokens)
    const outputTokens = tokenCount(usage.outputTokens)
    const cachedInputTokens = cachedTokenCount(usage)

    return {
      ...base,
      finishedAt: new Date().toISOString(),
      status: 'ok',
      traceId,
      solved: verification.passed,
      tamper: stats.testFileWrites > 0,
      steps: result.steps.length,
      toolCalls: stats.calls,
      toolErrors: stats.errors,
      malformedCalls: countMalformedCalls(result.steps),
      inputTokens,
      outputTokens,
      cachedInputTokens,
      costUsd: computeCostUsd(spec, { inputTokens, outputTokens, cachedInputTokens }),
      wallMs,
      firstActionMs,
      finishReason: String(result.finishReason),
    }
  } catch (error) {
    return {
      ...base,
      finishedAt: new Date().toISOString(),
      status: 'agent_error',
      traceId,
      solved: false,
      tamper: stats.testFileWrites > 0,
      steps: 0,
      toolCalls: stats.calls,
      toolErrors: stats.errors,
      malformedCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      costUsd: 0,
      wallMs: Date.now() - startedAt,
      firstActionMs,
      finishReason: 'error',
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    }
  } finally {
    await sandbox.destroy()
  }
}
