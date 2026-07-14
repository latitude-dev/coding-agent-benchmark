export function mergeIntervals(intervals) {
  if (intervals.length <= 1) return [...intervals]

  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const merged = [sorted[0].slice()]

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i]
    const last = merged[merged.length - 1]
    if (start <= last[1]) {
      last[1] = end
    } else {
      merged.push([start, end])
    }
  }

  return merged
}
