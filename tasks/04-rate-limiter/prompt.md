# Bug report: rate limiter rejects a request at the exact window edge

Our API throttling uses `SlidingWindowRateLimiter` with timestamps supplied by the
caller. With `{ limit: 2, windowMs: 1000 }`, calling `allow(0)`, `allow(100)`, then
`allow(1000)` returns `false` for the last call, even though the request at `0` is a
full window old by then and should no longer count. The expected result is `true`:
only timestamps strictly newer than `timestampMs - windowMs` should occupy a slot.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
