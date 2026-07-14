# Bug report: buildToc picks up headings from inside fenced code blocks

Our docs site builds page navigation with `buildToc`. A page containing this
markdown:

    # Setup
    ```bash
    # this is a shell comment, not a heading
    ```

produces a TOC with two entries, including `this is a shell comment, not a heading`.
The expected TOC has only the `Setup` entry. Oddly, fenced blocks that open with a
bare ``` fence (no language tag) are skipped correctly.

The test suite in this workspace reproduces the problem. Find the bug in the source
and fix it so the whole suite passes.
