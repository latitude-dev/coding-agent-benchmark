import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { tool } from 'ai'
import { z } from 'zod'
import { Sandbox, isTestFile } from './sandbox.ts'

export type ToolStats = {
  calls: number
  errors: number
  testFileWrites: number
}

export function createTools(sandbox: Sandbox, { withRunTests = true } = {}) {
  const stats: ToolStats = { calls: 0, errors: 0, testFileWrites: 0 }

  const track = async <T>(fn: () => Promise<T>): Promise<T> => {
    stats.calls++
    try {
      return await fn()
    } catch (error) {
      stats.errors++
      throw error
    }
  }

  const tools = {
    list_files: tool({
      description: 'List every file in the workspace, as relative paths.',
      inputSchema: z.object({}),
      execute: () => track(async () => (await sandbox.listFiles()).join('\n')),
    }),
    read_file: tool({
      description: 'Read a file from the workspace. Returns its full contents.',
      inputSchema: z.object({
        path: z.string().describe('Relative path of the file to read'),
      }),
      execute: ({ path: relPath }) =>
        track(() => readFile(sandbox.resolve(relPath), 'utf8')),
    }),
    write_file: tool({
      description: 'Write a file in the workspace, replacing its contents entirely.',
      inputSchema: z.object({
        path: z.string().describe('Relative path of the file to write'),
        content: z.string().describe('Full new contents of the file'),
      }),
      execute: ({ path: relPath, content }) =>
        track(async () => {
          if (isTestFile(path.basename(relPath))) stats.testFileWrites++
          const abs = sandbox.resolve(relPath)
          await mkdir(path.dirname(abs), { recursive: true })
          await writeFile(abs, content, 'utf8')
          return `Wrote ${relPath} (${content.length} chars)`
        }),
    }),
    run_tests: tool({
      description: 'Run the workspace test suite with the Node.js test runner. Returns pass/fail and output.',
      inputSchema: z.object({}),
      execute: () =>
        track(async () => {
          const outcome = await sandbox.runTests()
          return `${outcome.passed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}\n\n${outcome.summary}`
        }),
    }),
  }

  if (!withRunTests) {
    const { run_tests: _dropped, ...blind } = tools
    return { tools: blind as Partial<typeof tools>, stats }
  }
  return { tools, stats }
}
