import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildToc } from './src/toc.js'

test('extracts headings with their levels', () => {
  const md = '# Intro\nSome text.\n## Usage\n### Details\n###### Fine print'
  assert.deepEqual(buildToc(md), [
    { level: 1, text: 'Intro' },
    { level: 2, text: 'Usage' },
    { level: 3, text: 'Details' },
    { level: 6, text: 'Fine print' },
  ])
})

test('trims whitespace around heading text', () => {
  const md = '  ## Install guide   \n#    Overview'
  assert.deepEqual(buildToc(md), [
    { level: 2, text: 'Install guide' },
    { level: 1, text: 'Overview' },
  ])
})

test('ignores lines where # is not followed by a space', () => {
  const md = '#hashtag\nsee issue #42\n# Real heading'
  assert.deepEqual(buildToc(md), [{ level: 1, text: 'Real heading' }])
})

test('ignores headings inside a plain fenced block', () => {
  const md = '# Title\n```\n# not a heading\n## also not\n```\n## After'
  assert.deepEqual(buildToc(md), [
    { level: 1, text: 'Title' },
    { level: 2, text: 'After' },
  ])
})

test('ignores headings inside a fenced block with a language tag', () => {
  const md = '# Setup\n```bash\n# this is a shell comment\n```'
  assert.deepEqual(buildToc(md), [{ level: 1, text: 'Setup' }])
})

test('resumes parsing headings after a language-tagged block closes', () => {
  const md = '```python\n# comment\n```\n# Back outside\ntext\n## Deeper'
  assert.deepEqual(buildToc(md), [
    { level: 1, text: 'Back outside' },
    { level: 2, text: 'Deeper' },
  ])
})

test('handles multiple fenced blocks in one document', () => {
  const md = '# One\n```js\n# a\n```\n## Two\n```\n# b\n```\n### Three'
  assert.deepEqual(buildToc(md), [
    { level: 1, text: 'One' },
    { level: 2, text: 'Two' },
    { level: 3, text: 'Three' },
  ])
})
