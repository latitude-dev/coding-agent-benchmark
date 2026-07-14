# Bug report: import errors point at the wrong file line

We imported a CSV where the third data row had `oops` in an integer column. That row
sits on line 4 of the file (the header is line 1), but the error report says
`{ line: 3 }`. Every reported line number is short by one, which sends people to the
wrong row when they go fix their files. The imported records themselves are correct,
and files without bad rows import perfectly. Expected error line numbers to match the
actual line in the file, counting the header as line 1.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
