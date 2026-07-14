# Bug report: parseCsvLine splits a quoted field after an escaped quote

We use `parseCsvLine` to read one line of a CSV export. Fields that contain an escaped
double quote (`""`) get mangled: parsing `'"say ""hi"", please",ok'` returns
`['say "hi', ' please"', 'ok']` instead of the expected `['say "hi", please', 'ok']`.
It looks like everything after the escaped quote is no longer treated as part of the
quoted field.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
