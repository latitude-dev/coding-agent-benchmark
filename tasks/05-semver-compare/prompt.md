# Bug report: compareSemver ranks a prerelease above its release

Our update checker uses `compareSemver` to decide whether a newer version exists.
It reports `1.2.3-rc.1` as newer than `1.2.3`: `compareSemver('1.2.3-rc.1', '1.2.3')`
returns `1`, so users already on the stable release get prompted to "upgrade" to the
release candidate. Per semver, a prerelease has lower precedence than the same version
without one, so the expected result is `-1`.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
