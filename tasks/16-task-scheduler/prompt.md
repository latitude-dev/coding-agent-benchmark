# Bug report: high-priority tasks run last once their dependency finishes

We use this scheduler to run build pipelines. Tasks declare `dependsOn` and a numeric
`priority`, and the scheduler promises that whenever several tasks are ready to run at
the same moment, the one with the highest priority goes first (ties break alphabetically
by name).

That promise is broken. With these tasks:

- `fetch` (priority 5)
- `transform` (priority 4, depends on `fetch`)
- `archive` (priority 2)
- `cleanup` (priority 1)

the run order should be `fetch, transform, archive, cleanup`, because the moment `fetch`
finishes, `transform` is ready and outranks everything else. Instead we observe
`fetch, archive, cleanup, transform`, so our most urgent follow-up work waits behind
low-priority housekeeping. The recorded run log after a failed task shows the same
misordering, which breaks our reporting.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
