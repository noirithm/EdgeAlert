# StateWeave

A browser-based accessibility testing tool that explores a web app's UI
interactions, records state transitions, checks accessibility invariants on
each transition, and generates reproducible Playwright regression tests for
every failure found.

Static scanners (axe-core, Lighthouse) check one page state at a time.
StateWeave finds bugs that only appear between states: focus lost after
closing a dialog, search results updating silently, aria-expanded out of
sync with the element it controls, and more.

## Quickstart
Not written yet.

## How invariants work
Not written yet.

## Benchmark results
Not written yet.

## Limitations
StateWeave inspects the accessibility tree and DOM proxies for it. It does
not drive an actual screen reader, and it is not a replacement for manual
testing with real assistive technology. This section will grow as more
invariants are added.
