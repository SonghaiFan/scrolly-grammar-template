# Changelog

All notable changes to ScrollyLite are documented here.

## 0.2.0 - Unreleased

Release candidate in this checkout; not yet published. This minor release adds
standalone visualization transitions and focused imports. Migration notes are
in `docs/migrating-to-0.2.md`; unsupported transform syntax now throws instead
of silently falling back.

- Aligned package/lockfile/CDN examples for the 0.2.0 candidate. Added migration
  notes, version/path/link checks, and browser tests that execute documentation
  HTML with files extracted from the candidate tarball.
- Corrected obsolete documentation for `.filter()`, Story `.view()` forms,
  deferred `.add()` compilation, plugin registration and instance ownership.
- Added `clean:check`: a fresh dependency install and full release gate in a
  temporary source copy without existing dist, using an independent HTTP port.
- Clarified Node 20+ release tooling versus Node 18 package consumption; CI
  separately checks the built package under Node 18 after its Node 22 release gate.
- Removed homepage dependencies on local node_modules URLs and timestamp module
  identities; covered showcase, button and progress controls at desktop/mobile
  widths. Normal npm consumer tests verify required D3 and optional Arquero.

- Scoped built-in renderer helpers, Story color maps and theme tokens to each
  instance, including delayed callbacks and resize. Shared theme stylesheets are
  reference counted; destruction preserves application-owned styles and later
  token changes. External CSS remains document-wide.
- Story/chart/page initialization now preserves original host nodes/listeners,
  class and theme when data, stylesheet or initial rendering fails.
- Included real-browser regression tests in the release/publish gate and updated
  CI to install Chromium before running that gate.
- Replaced native scroll polling with event-coalesced measurements and resize
  observation. Destroy cancels navigation/hash/resize work and interrupts owned
  SVG transitions; chart controls reject reuse after destruction.
- Assigned per-scene SVG clipping IDs, preventing simultaneous charts from
  clipping against another instance. Added idle, wheel, cleanup and clip tests.
- Seq now snapshots inputs, guards empty/invalid navigation, and exposes
  `unbind()`/`off("change")` to release bindings. Removed its TypeScript bypass.
- Fixed DOM action index precedence, including index zero, and made plain action
  inspection safe without a browser DOM.

- Scene inference now uses endpoint semantics only. Equivalent builders/raw specs
  agree; repeated operations cannot create phantom scenes. Bar measure changes
  are observation; pure axis swaps are guide; filter changes remain focus.
- Added strict transform/filter grammar validation, fixed zero limits, constant
  bins and sparse-row table schemas, and parsed string selectors consistently.
  Unknown aggregate operators/time units no longer silently fall back or no-op.
- Added all-weather-example navigation checks across four idioms/two layouts;
  D3 and Arquero are explicit development dependencies for clean test installs.

- Extracted standalone transition surfaces, shared view rendering, chart shells,
  and data utilities from the Story runtime. Pair transitions lazily load only
  their idiom and no longer import Story/navigation/scroll drivers.
- Added `scrollylite/plugins`, per-pair idiom registry snapshots, registered
  plugin compiler support, and explicit `transitionEvaluation` cache capability.
- Unified runtime declarations and browser wrappers; added installed-consumer
  TypeScript checks and actual-browser module-boundary/embedding tests. Failed
  initial pair rendering restores the previous target nodes and listeners.
- Added a full bar-plus-transition gzip budget including required shared/lazy
  chunks, and a consistency check between eager and lazy built-in manifests.

- Split focused package entry points for `scrollylite/core`, `scrollylite/bar`,
  `scrollylite/transition`, and `scrollylite/story`. Bar authoring no longer
  imports the global four-idiom compiler manifest.
- Added the public `delta(from, to)` and `visualizationSpec()` core primitives.
- Made Arquero optional when no data transforms are declared, and added enforced
  gzip budgets for the focused core and bar-authoring bundles.
- Aligned ESM and browser Seq wrappers, exported the dark and paper theme entry
  points, excluded theme design notes from the published package, and isolated
  the pack-consumer test from the user's npm cache.

- Built-in bar transitions now cache property interpolation tracks, phase layouts,
  and endpoint membership during initialization. Progress and playback reuse SVG
  nodes, including reversible entry/exit and split/merge/flip phases. `resize()`
  recompiles against the same loaded data. Other idioms retain the reconstruction
  path. Added cache parity, node/listener reuse, and compilation-boundary checks,
  plus a repeatable 100/500/1000-mark benchmark.

- Added standalone `transition(from, to, options)` for same-idiom visualization
  instances, with synchronous progress, time playback, pause, resize, and cleanup.
- Added deferred `.data(...)` binding to zero-argument chart factories; data source
  rebinding replaces previous source metadata.
- Extended semantic diff to detect data and all declared encoding channels;
  object property order no longer produces a false difference.
- Added a local transition example and repeatable browser regression checks.

## 0.1.1 - 2026-06-09

Patch release for the D3-style ESM-first documentation and examples.

- Updated README, docs, `llms.txt`, and the minimal example to recommend
  browser-native `+esm` CDN imports.
- Kept the global bundle documented as a plain script fallback.
- Updated pinned CDN examples to `scrollylite@0.1.1`.
- Fixed the homepage install snippets so long CDN import lines do not cause
  horizontal page overflow on mobile.

## 0.1.0 - 2026-06-08

Initial public package candidate.

- Added the browser ESM runtime and CDN-ready `dist/` build.
- Added a plain script-tag global build that exposes `ScrollyLite` for CDN use.
- Added the small public API: `createStory`, `story`, `bar`, `line`,
  `point`, `unit`, `defineChartIdiom`, `registerChartIdiom`,
  `registerChartModule`, and `availableChartIdioms`.
- Added function-based chart idiom plugins for `bar`, `line`, `point`, and
  `unit`.
- Removed legacy alias keys, global D3/Arquero lookups, demo-coupled runtime
  paths, and internal helper exports from the package entry.
- Added package checks for manifest drift, public API drift, tarball contents,
  consumer install/import behavior, CSS/theme subpath exports, and publish
  readiness.
