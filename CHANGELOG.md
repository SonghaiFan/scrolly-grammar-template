# Changelog

## 0.2.0 - Unreleased first release

VisDelta is still a greenfield first release. There is no compatibility layer
and no migration guide yet.

- Named the standalone chart-transition library **VisDelta**.
- Established one public language: Data, Transform, Chart state, Chart type,
  Mapping, Scale, Axis, Marks, Match, Enter/Stay/Exit, Difference, Step, Order,
  Transition, Frame, Control, Runtime, and Plugin.
- Added `area`, `bar`, `line`, `point`, and `unit` chart types with shared chainable
  methods and explicit chart-specific methods.
- Added `delta(from, to)` and `transition(from, to, options)` for two states of
  the same chart type.
- Made transitions playable, reversible, resizable, and directly controllable
  at any progress value from `0` to `1`.
- Added ordered x/y steps that keep marks, scales, and axes together.
- Added reversible bar changes for values, filters, highlights, colors, order,
  orientation, data updates, stacked/grouped layouts, and split/merge.
- Added cached point transitions for x/y changes, filters, highlights, colors,
  sizes, data updates, ordered axis flips, and reversible detail/summary changes.
- Added focused Line authoring and a sixteen-scenario Line Lab covering mappings,
  filters, focus, data, highlight, style, ordered flip, sliding windows, and reversible
  total/series changes.
- Added an independent Area module built around explicit `y0`/`y1` band
  geometry, ordinary baselines, diverging stacks, and reversible total/stacked
  changes, with a fourteen-scenario editable Area Lab.
- Area total/detail transitions draw a one-pixel contrast divider along each
  internal stack boundary before the layer edges appear. Merge is the exact
  cached reverse of that same split timeline.
- Made Area observation changes key-aware. New and restored values grow from
  zero thickness at their target x; Filter/Remove reuse those frames backward
  and flatten exiting values into the baseline.
- Added Area `.connect("adjacent" | "across")`. The default preserves honest
  gaps from middle filters as separate connected stretches, matching Line
  continuity. Ordinal Area now uses half-interval observation cells and does not
  draw an isolated observation with no connected neighbour.
- Added Area `.curve()` with the exact D3 curve names supported by `d3.area()`.
  Curve changes use shared rendered-path matching; D3's Line-only `curveBundle`
  is rejected before rendering.
- Separated data membership, attention, and view semantics across Bar, Line, and
  Point: `.where()` removes rows, `.highlight()` keeps rows and changes emphasis,
  and `.focus()` keeps rows while fitting the visible coordinate range.
- Added Line `.connect("adjacent" | "across")`. Internal observations removed by
  `.where()` now leave an honest gap unless the author explicitly connects across it.
- Made Line split cut the total into colored pieces, move the pieces to their
  series positions, then connect them; merge evaluates the same plan backward.
- Made Line `.rollup()` perform a real x-grouped aggregate and made `.curve()`
  accept all 20 exact D3 7 curve export names, with `"curveLinear"` as default.
- Added Line-owned SVG path matching so curve and geometry changes move matched
  points instead of interpolating unrelated numbers in different `d` commands.
- Made `.key()` control observations inside Line paths. Line now chooses plain-
  English path plans for moving, adding, removing, shifting, or shape-matching
  points, while keeping this behavior outside VisDelta Core.
- Made Line observation membership changes share one reversible path: Add and
  Restore move the line before showing points; Remove and Filter run those exact
  frames backward, hiding points before retracting the line.
- Made color an explicit mapping. Marks are black when no color is given.
- Added the `ChartType` plugin API: `defineChartType()`, `registerChartType()`,
  `registerChartModule()`, and `availableChartTypes()`.
- Added self-contained lazy chart modules. A chainable state now carries its
  chart implementation, so the generic transition runtime has no built-in chart
  names and an independently imported chart works without global registration.
- Made Area, Bar, Point, and Line Lab scenarios discoverable modules instead of hard-coded
  branches in the shared documentation editor.
- Added focused package entries for core difference calculation, area, bar, point, and line
  authoring, transitions, plugins, browser use, and composition adapters.
- Added strict transform validation. Arquero is needed only when a chart uses a
  data transform; D3 remains the rendering dependency.
- Added one VitePress documentation site with live editors, fourteen-scenario
  Area Lab, thirteen-scenario Bar and Point Labs, a sixteen-scenario Line Lab, a language roadmap,
  and automated terminology checks.
- Added Node, browser, package, documentation, and bundle-size checks.

The current limits are documented in the [language framework](docs/language-framework.md).
