import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { MockLanguageModelV4 } from 'ai/test'
import type { LanguageModel } from 'ai'

export type ModelSpec = {
  key: string
  label: string
  provider: 'anthropic' | 'openai' | 'google' | 'mock'
  model: () => LanguageModel
  // USD per million tokens, from models.dev (base tier; our tasks stay far under tier cutoffs)
  pricing: { input: number; output: number; cacheRead: number; cacheWrite?: number }
  envKey: string
}

export const MODELS: ModelSpec[] = [
  {
    key: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'anthropic',
    model: () => anthropic('claude-opus-4-8'),
    pricing: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    key: 'claude-fable-5',
    label: 'Claude Fable 5',
    provider: 'anthropic',
    model: () => anthropic('claude-fable-5'),
    pricing: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    key: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    provider: 'anthropic',
    model: () => anthropic('claude-sonnet-5'),
    pricing: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    key: 'gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    model: () => openai('gpt-5.5'),
    pricing: { input: 5, output: 30, cacheRead: 0.5 },
    envKey: 'OPENAI_API_KEY',
  },
  {
    key: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    provider: 'openai',
    model: () => openai('gpt-5.6-sol'),
    pricing: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25 },
    envKey: 'OPENAI_API_KEY',
  },
  {
    key: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    provider: 'openai',
    model: () => openai('gpt-5.6-terra'),
    pricing: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 3.125 },
    envKey: 'OPENAI_API_KEY',
  },
  {
    key: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    provider: 'openai',
    model: () => openai('gpt-5.6-luna'),
    pricing: { input: 1, output: 6, cacheRead: 0.1, cacheWrite: 1.25 },
    envKey: 'OPENAI_API_KEY',
  },
  {
    key: 'gpt-5.3-codex',
    label: 'GPT-5.3 Codex',
    provider: 'openai',
    model: () => openai('gpt-5.3-codex'),
    pricing: { input: 1.75, output: 14, cacheRead: 0.175 },
    envKey: 'OPENAI_API_KEY',
  },
  {
    key: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    provider: 'google',
    model: () => google('gemini-3.1-pro-preview'),
    pricing: { input: 2, output: 12, cacheRead: 0.2 },
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
  },
  {
    key: 'mock',
    label: 'Mock (harness smoke test)',
    provider: 'mock',
    model: () =>
      new MockLanguageModelV4({
        provider: 'mock',
        modelId: 'mock-1',
        doGenerate: async () => ({
          content: [{ type: 'text' as const, text: 'Smoke test: no fix attempted.' }],
          finishReason: 'stop' as const,
          usage: {
            inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 10, text: 10, reasoning: 0 },
          },
          warnings: [],
        }),
      }) as unknown as LanguageModel,
    pricing: { input: 0, output: 0, cacheRead: 0 },
    envKey: '',
  },
]

export function resolveModels(keys: string[]): ModelSpec[] {
  return keys.map((key) => {
    const spec = MODELS.find((m) => m.key === key)
    if (!spec) {
      throw new Error(`Unknown model "${key}". Available: ${MODELS.map((m) => m.key).join(', ')}`)
    }
    if (spec.envKey && !process.env[spec.envKey]) {
      throw new Error(`Model "${key}" needs ${spec.envKey} in the environment`)
    }
    return spec
  })
}

type TokenCount = number | { total?: number } | undefined

function count(value: TokenCount): number {
  if (typeof value === 'number') return value
  return value?.total ?? 0
}

export function computeCostUsd(
  spec: ModelSpec,
  usage: {
    inputTokens?: TokenCount
    outputTokens?: TokenCount
    cachedInputTokens?: TokenCount
  },
): number {
  const input = count(usage.inputTokens)
  const output = count(usage.outputTokens)
  const cached = count(usage.cachedInputTokens)
  const uncachedInput = Math.max(0, input - cached)
  const perTok = 1 / 1_000_000
  return (
    uncachedInput * spec.pricing.input * perTok +
    cached * spec.pricing.cacheRead * perTok +
    output * spec.pricing.output * perTok
  )
}
