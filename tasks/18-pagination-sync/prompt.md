# Bug report: records vanish from the cache when the server returns a short page

We sync collections from our API with `syncCollection`. The API pages results through
opaque cursors and is allowed to return fewer items than the requested page size on any
page, not just the last one (it truncates responses that would exceed its payload
limit), signaling the end of the collection with a `done` flag.

When that happens mid-stream, records silently disappear. With seven records
(ids 1 through 7) and a page size of 3, one sync saw the server truncate the second
page to two items (ids 4 and 5, with `done: false`). The sync completed without any
error, but the resulting list contains only six records: id 6 is gone, and it never
shows up in later syncs of the same data either. Expected behavior is that a sync
returns every record the server holds, no matter how the server chooses to chunk the
pages.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
