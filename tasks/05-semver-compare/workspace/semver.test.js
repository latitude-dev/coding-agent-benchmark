import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareSemver } from './src/semver.js'

test('orders by major, minor, then patch', () => {
  assert.equal(compareSemver('1.0.0', '2.0.0'), -1)
  assert.equal(compareSemver('2.1.0', '2.0.9'), 1)
  assert.equal(compareSemver('2.1.3', '2.1.4'), -1)
  assert.equal(compareSemver('10.0.0', '9.9.9'), 1)
})

test('equal versions compare as equal', () => {
  assert.equal(compareSemver('1.2.3', '1.2.3'), 0)
  assert.equal(compareSemver('1.2.3-alpha.1', '1.2.3-alpha.1'), 0)
})

test('a prerelease ranks below the same version without one', () => {
  assert.equal(compareSemver('1.2.3-rc.1', '1.2.3'), -1)
  assert.equal(compareSemver('1.2.3', '1.2.3-rc.1'), 1)
})

test('core version still wins over prerelease presence', () => {
  assert.equal(compareSemver('1.2.4-alpha', '1.2.3'), 1)
  assert.equal(compareSemver('1.2.3', '1.2.4-alpha'), -1)
})

test('alphanumeric prerelease identifiers compare lexically', () => {
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-beta'), -1)
  assert.equal(compareSemver('1.0.0-beta', '1.0.0-alpha'), 1)
})

test('numeric prerelease identifiers compare numerically', () => {
  assert.equal(compareSemver('1.0.0-alpha.2', '1.0.0-alpha.10'), -1)
  assert.equal(compareSemver('1.0.0-alpha.10', '1.0.0-alpha.2'), 1)
})

test('numeric identifiers rank below alphanumeric ones', () => {
  assert.equal(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.beta'), -1)
})

test('a longer prerelease list has higher precedence when prefixes match', () => {
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-alpha.1'), -1)
  assert.equal(compareSemver('1.0.0-alpha.1.1', '1.0.0-alpha.1'), 1)
})
