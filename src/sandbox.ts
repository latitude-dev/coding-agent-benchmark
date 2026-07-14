import { cp, mkdtemp, readdir, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

export type TestOutcome = {
  passed: boolean
  summary: string
}

export class Sandbox {
  readonly root: string
  readonly fixtureDir: string

  private constructor(root: string, fixtureDir: string) {
    this.root = root
    this.fixtureDir = fixtureDir
  }

  static async create(taskDir: string): Promise<Sandbox> {
    const fixtureDir = path.join(taskDir, 'workspace')
    const root = await mkdtemp(path.join(tmpdir(), 'bench-'))
    await cp(fixtureDir, root, { recursive: true })
    return new Sandbox(root, fixtureDir)
  }

  resolve(relPath: string): string {
    const abs = path.resolve(this.root, relPath)
    if (abs !== this.root && !abs.startsWith(this.root + path.sep)) {
      throw new Error(`Path escapes the workspace: ${relPath}`)
    }
    return abs
  }

  async listFiles(): Promise<string[]> {
    const entries = await readdir(this.root, { recursive: true, withFileTypes: true })
    return entries
      .filter((e) => e.isFile())
      .map((e) => path.relative(this.root, path.join(e.parentPath, e.name)))
      .sort()
  }

  async runTests(timeoutMs = 30_000): Promise<TestOutcome> {
    return new Promise((resolvePromise) => {
      execFile(
        process.execPath,
        ['--test', '--test-reporter=spec'],
        { cwd: this.root, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const output = `${stdout}\n${stderr}`.trim()
          resolvePromise({
            passed: error === null,
            summary: truncateTestOutput(output),
          })
        },
      )
    })
  }

  // Restores pristine test files so a tampered test cannot fake a pass, then scores.
  async verify(): Promise<TestOutcome> {
    const fixtureFiles = await readdir(this.fixtureDir, { recursive: true, withFileTypes: true })
    for (const entry of fixtureFiles) {
      if (!entry.isFile() || !isTestFile(entry.name)) continue
      const rel = path.relative(this.fixtureDir, path.join(entry.parentPath, entry.name))
      await cp(path.join(this.fixtureDir, rel), path.join(this.root, rel))
    }
    return this.runTests()
  }

  async destroy(): Promise<void> {
    await rm(this.root, { recursive: true, force: true })
  }
}

export function isTestFile(name: string): boolean {
  return /\.test\.m?js$/.test(name)
}

function truncateTestOutput(output: string, maxChars = 6_000): string {
  if (output.length <= maxChars) return output
  return `${output.slice(0, maxChars)}\n[... output truncated ...]`
}
