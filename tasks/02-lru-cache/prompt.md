# Bug report: LruCache evicts a key that was just read

We use `LruCache` to cache rendered templates. With a capacity of 2, running
`set('a', 1)`, `set('b', 2)`, `get('a')`, `set('c', 3)` evicts `a` even though it was
the most recently used entry, so `get('a')` afterwards returns `undefined`. The expected
behavior is that `b` gets evicted and `get('a')` still returns `1`.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
