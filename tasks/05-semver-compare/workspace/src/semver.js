function parse(version) {
  const dash = version.indexOf('-')
  const core = dash === -1 ? version : version.slice(0, dash)
  const prerelease = dash === -1 ? [] : version.slice(dash + 1).split('.')
  const [major, minor, patch] = core.split('.').map(Number)
  return { major, minor, patch, prerelease }
}

const NUMERIC = /^\d+$/

function compareIdentifiers(x, y) {
  const xNumeric = NUMERIC.test(x)
  const yNumeric = NUMERIC.test(y)
  if (xNumeric && yNumeric) {
    const nx = Number(x)
    const ny = Number(y)
    if (nx === ny) return 0
    return nx < ny ? -1 : 1
  }
  if (xNumeric !== yNumeric) return xNumeric ? -1 : 1
  if (x === y) return 0
  return x < y ? -1 : 1
}

export function compareSemver(a, b) {
  const pa = parse(a)
  const pb = parse(b)

  for (const part of ['major', 'minor', 'patch']) {
    if (pa[part] !== pb[part]) return pa[part] < pb[part] ? -1 : 1
  }

  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0
  if (pa.prerelease.length === 0) return -1
  if (pb.prerelease.length === 0) return 1

  const length = Math.max(pa.prerelease.length, pb.prerelease.length)
  for (let i = 0; i < length; i++) {
    const x = pa.prerelease[i]
    const y = pb.prerelease[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const result = compareIdentifiers(x, y)
    if (result !== 0) return result
  }

  return 0
}
