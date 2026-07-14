# Bug report: retry backoff delays blow past maxDelayMs

Our HTTP client wraps flaky calls with `retry`. With `baseDelayMs: 100` and
`maxDelayMs: 400`, a call that fails five times in a row waits 100ms, 200ms, 400ms,
and then 800ms between attempts, even though the configured cap is 400ms. The
expected delays are 100, 200, 400, 400.

The test suite in this workspace reproduces the problem using an injected fake
`sleep`, so no real waiting happens. Find the bug in the source and fix it so the
whole suite passes.
