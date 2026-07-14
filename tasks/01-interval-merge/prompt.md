# Bug report: mergeIntervals loses coverage when intervals are contained

Our scheduling code merges busy time ranges with `mergeIntervals`. A user reported that
merging `[[1, 10], [2, 3]]` returns `[[1, 3]]`, which drops most of the original range.
The expected result is `[[1, 10]]`.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
