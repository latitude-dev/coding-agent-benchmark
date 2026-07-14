# Bug report: a rejected patch still changes the document

We apply JSON patches with `applyPatch`, which is documented as atomic: either every
operation applies and you get the new document back, or the patch throws and your
original document is untouched.

The second half of that promise fails. Starting from

```js
const doc = { user: { name: 'ada', tags: ['x'] }, count: 1 }
```

we applied

```js
applyPatch(doc, [
  { op: 'replace', path: '/user/name', value: 'grace' },
  { op: 'replace', path: '/user/missing', value: 1 },
])
```

The second operation correctly fails and a `PatchError` is thrown, but afterwards
`doc.user.name` is `'grace'`. The rejected patch was half applied to the document we
passed in, which corrupts our stored records whenever a patch is refused. The same
happens with array operations: an append followed by a failing op leaves the appended
element behind.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
