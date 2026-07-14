# Bug report: flattenTree indents nodes that follow a nested section

Our outline view flattens a document tree with `flattenTree` and indents each row by its
`depth`. A user reported that a section coming right after a nested subsection renders
indented as if it were inside it. Flattening
`{ id: 'root', children: [{ id: 'a', children: [{ id: 'b' }] }, { id: 'c' }] }` returns
`c` with `depth: 2`, but `c` is a direct child of `root` and should have `depth: 1`.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
