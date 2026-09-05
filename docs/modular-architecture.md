# Module boundaries and remaining cleanup

This describes the 0.2.0 candidate in this checkout, not the 0.1.1 package.

## Public entry points

| Entry | Responsibility | Dependency boundary |
| --- | --- | --- |
| `scrollylite/core` | Endpoint normalization and semantic delta | No DOM, Story, or renderers |
| `scrollylite/bar` | Immutable chainable bar authoring | Own compiler, no renderers or global manifest |
| `scrollylite/transition` | Pair initialization, seek, play, resize, destroy | Shared chart renderer; selected idiom loaded on demand |
| `scrollylite/plugins` | Plugin definition and registration | No eager built-in renderers or Story |
| `scrollylite/story` | Story, Seq, page/chart embedding and scrolling | Full built-in manifest and composition runtime |
| `scrollylite` | Compatible full API | Not the minimal entry |
| `scrollylite/browser` | Full API with global dependency fallback/installation | Delegates to the canonical ESM implementation |

The standalone path is `visualizations → data snapshots + idiom snapshot →
view compiler/renderer → frame evaluator → progress/play`. Story composes views
and supplies navigation/scroll input to the shared rendering layer; standalone
transitions do not load the Story shell, navigation, or scroll drivers.

The package does not yet have focused line/point/unit authoring entry points.
The global build remains a convenience full bundle, not a lightweight path.

## Size and regression gates

`npm run bundle:check` minifies with the pinned esbuild version and gzips outputs.
The focused delta fixture is about 3.2 KB; bar authoring about 6.9 KB; bar plus
transition about 34.7 KB. The last number sums the entry, required shared chunks,
and the lazy bar plugin, counting each once. It excludes unrelated idiom chunks,
D3, optional Arquero, and CSS. It is not the full application's download size.
Code splitting must be enabled in a consumer bundler to preserve lazy loading.
Native ESM also preserves the module boundary but transfers unminified modules.

Budgets are 4,000 / 8,000 / 35,000 gzip bytes respectively. The transition gate
also rejects Story or unrelated idiom source code in its selected module closure.
Browser tests independently inspect actual requests, not just bundler output.

`npm run pack:check` installs a real tarball in an isolated temporary consumer,
checks all public entries and browser globals, and compiles positive/negative
TypeScript usage without skipping declaration checks.

`npm run release:check` runs the unit/build/size gates, the real-browser suite,
and the installed-consumer check. The publish hook uses this same complete gate;
CI installs Chromium before invoking it.

## Legacy retained deliberately

- Root imports, Story, Seq, `createStory`, `createChart`, and `createPage` remain
  compatibility/composition APIs; they are not deprecated solely because the
  new pair API exists.
- Internal `createTransitionSurface` in the Story module is a compatibility
  bridge. Public pair code imports the independent runtime module directly.
- Scene names `focus`, `guide`, `granularity`, and `observation` still drive
  existing idiom compilation/planning. They are not a replacement for the
  endpoint delta. Inference now uses endpoint semantics only; operation history
  is retained solely as legacy inspection metadata.
- The cached evaluator still reads D3 transition schedules during compilation.
  Line/point/unit and unspecified plugins reconstruct on seek. Neither limitation
  is removed merely by splitting modules.
- Built-in and module-factory helpers now capture per-instance theme/color
  contexts; Story and pair idiom registries are snapshots. Externally registered
  runtime idioms still own their own dependency management. External CSS remains
  document-wide; stylesheet leases do not provide CSS selector isolation.

## Next release hardening

1. Completed: endpoint-only scene inference, with builder/raw-spec parity tests.
2. Completed: strict transform/operator validation and tests for zero limits,
   sparse rows, constant/empty bins, scalar expressions and compound comparisons.
3. Completed: instance-scoped Story colors/theme tokens, shared stylesheet leases,
   and asynchronous mount failure cleanup. Also implemented: idempotent destruction, pending navigation/hash/resize
   cancellation, owned SVG interruption, unique clip IDs, and Seq unbind/off.
4. Implemented: weather navigation across all idioms/layouts; native wheel input,
   event coalescing, geometry resize observation, idle-work and post-destroy
   inactivity checks. These are behavior tests, not a full visual accessibility audit.
5. Implemented: 0.2.0 candidate metadata, migration notes, versioned CDN paths,
   link/path/version checks and actual tarball-backed browser execution of the
   documentation templates. `clean:check` independently installs and rebuilds
   the current source before running the complete release gate.

This module split is implemented and testable. Passing release checks means a
candidate is validated, not that npm publication, a Git tag or a push occurred.
