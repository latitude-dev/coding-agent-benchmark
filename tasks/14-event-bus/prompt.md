# Bug report: a once() handler ran twice during a re-entrant emit

We use the bus to coordinate state sync. A high-priority handler on `sync` re-broadcasts
the event exactly one time when it first sees it (it emits `sync` again from inside its
own handler). A listener registered with `once(bus, 'sync', handler)` was invoked twice:
first with the re-broadcast payload, then again with the original one. Expected `once`
to invoke its handler exactly one time no matter how the emits nest. Plain back-to-back
emits behave correctly, so this only shows up when an emit happens inside a handler.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
