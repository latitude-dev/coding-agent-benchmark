# Bug report: debounced search sends the stale first query

Our search box debounces keystrokes with `debounce`. A user types quickly — "l", "la",
"lat" — and after the wait elapses the request goes out for "l", the first thing they
typed, instead of "lat". Calling the debounced function three times in a row inside the
wait window and then letting the timer fire invokes the wrapped function with the FIRST
call's arguments; it should be invoked with the LAST call's arguments.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
