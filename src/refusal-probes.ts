// Controlled probes for Claude Fable 5's content-filter refusals, run against
// tasks/17-json-patch (refused 3/3 in oracle mode, attempted 3/3 in blind mode
// during the production benchmark on 2026-07-14).
//
// Observed across the day (each probe printed with a timestamp so runs can be
// compared): no single variable explains the refusals. Instruction wording,
// presence of test files, presence of the run_tests tool, and exact replicas of
// previously-successful configurations have all refused in some windows and
// succeeded in others, while a near-identical request through the raw Anthropic
// API succeeded in the same minute an SDK replica refused.
import { generateText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { readFile } from 'node:fs/promises'
import { Sandbox } from './sandbox.ts'
import { createTools } from './tools.ts'

const TASK = 'tasks/17-json-patch'

const ORACLE_TEXT = `You are a coding agent working in a small JavaScript project.
The project has a test suite that currently fails because of a bug in the source code.
Your job is to find the bug and fix it so that every test passes.

Rules:
- Explore with list_files and read_file before changing anything.
- Fix the source code. Do not modify test files; they define the expected behavior.
- Use run_tests to check your work. Keep going until all tests pass or you are certain you cannot fix it.
- When the tests pass, reply with a one-paragraph summary of the bug and your fix.`

const BLIND_TEXT = `You are a coding agent working in a small JavaScript project.
The project has a bug, described in the report below. The test suite is not available in
this workspace, and there is no way to execute the code; a hidden test suite will verify
your fix afterward. Work from the report and the source alone.

Rules:
- Explore with list_files and read_file, and reason carefully about the code before changing anything.
- Fix the root cause of the reported behavior in the source code.
- Change as little as possible; unrelated edits risk failing the hidden suite.
- When you are confident in the fix, reply with a one-paragraph summary of the bug and your fix.`

const SOFT_TEXT = `You are a coding agent working in a small JavaScript project.
A user reported the bug described below. Investigate the source code, find the root cause,
and repair it. When you are done, reply with a one-paragraph summary of the bug and your fix.`

const PROBES = [
  { name: 'oracle text, oracle env (production oracle replica)', instructions: ORACLE_TEXT, includeTests: true, withRunTests: true },
  { name: 'blind text, blind env (production blind replica)', instructions: BLIND_TEXT, includeTests: false, withRunTests: false },
  { name: 'soft text, oracle env', instructions: SOFT_TEXT, includeTests: true, withRunTests: true },
  { name: 'soft text, tests on disk, no run_tests tool', instructions: SOFT_TEXT, includeTests: true, withRunTests: false },
  { name: 'soft text, no tests on disk, with run_tests tool', instructions: SOFT_TEXT, includeTests: false, withRunTests: true },
  { name: 'blind text, oracle env', instructions: BLIND_TEXT, includeTests: true, withRunTests: true },
]

async function rawApiProbe(prompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-fable-5',
      max_tokens: 2048,
      system:
        'You are a coding agent working in a small JavaScript project.\nThe project has a bug, described in the report below. Work from the report and the source alone.',
      messages: [{ role: 'user', content: prompt }],
      tools: [
        { name: 'list_files', description: 'List every file in the workspace, as relative paths.', input_schema: { type: 'object', properties: {} } },
        { name: 'read_file', description: 'Read a file from the workspace.', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
        { name: 'write_file', description: 'Write a file in the workspace.', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
      ],
    }),
  })
  const body = (await res.json()) as { stop_reason?: string; content?: Array<{ type: string }> }
  console.log(
    `[${new Date().toISOString()}] raw Anthropic API, blind-style: http=${res.status} stop_reason=${body.stop_reason} blocks=${(body.content ?? []).map((b) => b.type).join(',') || 'none'}`,
  )
}

async function main() {
  const prompt = await readFile(`${TASK}/prompt.md`, 'utf8')

  for (const probe of PROBES) {
    const sandbox = await Sandbox.create(TASK, { includeTests: probe.includeTests })
    const { tools } = createTools(sandbox, { withRunTests: probe.withRunTests })
    try {
      const r = await generateText({
        model: anthropic('claude-fable-5'),
        instructions: probe.instructions,
        prompt,
        tools,
        stopWhen: stepCountIs(24),
        telemetry: { isEnabled: false },
      })
      console.log(`[${new Date().toISOString()}] ${probe.name}: finish=${r.finishReason} steps=${r.steps.length}`)
    } catch (error) {
      const e = error as Error
      console.log(`[${new Date().toISOString()}] ${probe.name}: threw ${e.name}: ${e.message.slice(0, 100)}`)
    } finally {
      await sandbox.destroy()
    }
  }

  await rawApiProbe(prompt)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
