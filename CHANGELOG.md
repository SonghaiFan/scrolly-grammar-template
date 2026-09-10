# Changelog

## 0.2.0 - Unreleased first release

VisDelta is still a greenfield first release. There is no compatibility layer
and no migration guide yet.

- Named the standalone chart-transition library **VisDelta**.
- Established one public language: Data, Transform, Chart state, Chart type,
  Mapping, Scale, Axis, Marks, Match, Enter/Stay/Exit, Difference, Step, Order,
  Transition, Frame, Control, Runtime, and Plugin.
- Added `bar`, `line`, `point`, and `unit` chart types with shared chainable
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
- Made color an explicit mapping. Marks are black when no color is given.
- Added the `ChartType` plugin API: `defineChartType()`, `registerChartType()`,
  `registerChartModule()`, and `availableChartTypes()`.
- Added focused package entries for core difference calculation, bar and point
  authoring, transitions, plugins, browser use, and composition adapters.
- Added strict transform validation. Arquero is needed only when a chart uses a
  data transform; D3 remains the rendering dependency.
- Added one VitePress documentation site with live editors, twelve-scenario Bar
  and Point Labs, a language roadmap, and automated terminology checks.
- Added Node, browser, package, documentation, and bundle-size checks.

The current limits are documented in the [language framework](docs/language-framework.md).
