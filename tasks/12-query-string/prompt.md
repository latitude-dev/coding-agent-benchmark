# Bug report: parseQuery leaves literal plus signs in decoded values

Our search page parses the URL query with `parseQuery`. Submitting a search for
"hello world" produces the query string `q=hello+world`, and `parseQuery` returns
`{ q: 'hello+world' }`. The expected result is `{ q: 'hello world' }`. Values
encoded with `%20` decode to spaces just fine, and an encoded plus (`%2B`) should
still come back as a literal `+`.

The test suite in this workspace reproduces the problem. Find the bug in the source
and fix it so the whole suite passes.
