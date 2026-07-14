const headingPattern = /^(#{1,6})\s+(.+)$/

export function buildToc(markdown) {
  const toc = []
  let inFence = false

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }

    if (inFence) continue

    const match = headingPattern.exec(trimmed)
    if (!match) continue

    const text = match[2].trim()
    if (text === '') continue

    toc.push({ level: match[1].length, text })
  }

  return toc
}
