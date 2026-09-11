# Chart-Type Folders

VisDelta is designed to run as a browser ESM library from a CDN URL. That
means runtime code cannot scan `src/charts/` or discover new files dynamically.
Every official chart type is therefore represented by one folder plus generated
static ESM lists. Runtime discovery never depends on scanning folders.

## Folder Contract

Each chart type lives in:

```text
src/charts/<chart-type>/
```

The folder becomes a chart module when it exposes both:

```text
src/charts/<chart-type>/plugin.ts
src/charts/<chart-type>/module.ts
```

`plugin.ts` contains the loaded chart recipe. `module.ts` is the lightweight,
lazy reference carried by that chart's authoring state:

```js
export const chartModule = defineChartModule({
  key: "area",
  load: () => import("./plugin.js")
});
```

That file should export:

```js
export const plugin = defineChartType({
  key: "<chart-type>",
  scenes: ["selection", "axis", "detail", "mapping"],
  stateOperations: {
    selection: "filter",
    axis: "coordinate",
    detail: "aggregate"
  },
  createRenderer,
  createSpecCompiler,
  prepareSpec,
  transition: {
    plan,
    intermediateSpecs
  },
  defaults: {
    margin
  },
  inspect
});
```

The runtime `ChartType` produced by `createChartType()` is intentionally flat:

```js
{
  key,
  renderer,
  prepareSpec,
  resolveTransitionPlan,
  intermediateSpecs,
  defaultMargin,
  inspect,
  scenes,
  stateOperations
}
```

Only `key` and `renderer` are required for rendering. `createSpecCompiler()` is
required when the chart type has authoring operations that compile into a Vega-ish
spec. `scenes` and `stateOperations` declare compiler capability, so transition
code does not need mark-specific switch statements. Do not add empty hook bags;
the plugin metadata is the contract.

## CDN-compatible module lists

The generator writes two lists:

```text
builtins.ts  lightweight lazy references used by the complete entry
manifest.ts  eagerly loaded plugins exposed only by the low-level composition entry
```

The generic `src/runtime/chart-registry.ts` imports neither list and contains no
concrete chart names. A focused builder supplies its own chart module directly.
The complete `visdelta` entry registers the generated lightweight references as
a convenience collection.

After adding or removing a chart-type folder, run:

```sh
node scripts/sync-chart-manifest.mjs
```

Then run `npm run manifest:check` and build. No runtime map needs a manual edit.
The check requires every discovered plugin folder to provide `module.ts` and
rejects concrete chart imports in the generic registry.

## Bar Ground Truth

All bar-specific code lives under `src/charts/bar/`, including authoring,
rendering, transition planning, layout renderers, keys, and semantic diff
helpers. The generic `src/grammar/` package may re-export `bar()` for
convenience, but it does not own the bar-chart implementation.

The current bar pipeline is:

```text
authoring.js / grammar.js
  -> compile.js
  -> semantic.js / diff.js
  -> state.js transition plan
  -> render.js + layout-*.js
  -> render-pattern.js D3 join and ordered transition steps
```

- `grammar.js` is the authoring entry for `bar()` and `BarState`.
- `plugin.js` is the runtime plugin entry. Keep it authoring-free so the CDN
  runtime can register the chart type without importing grammar code.
- `module.js` is the lightweight lazy reference returned by `BarState.chartModule()`.
- `index.js` is a public barrel that can re-export authoring helpers.
- `compile.js` turns bar authoring operations such as filter/highlight,
  coordinate/scale/layout, breakdown, and rollup into Vega-ish `data`,
  `transform`, `mark`, `encoding`, and `meta` spec fields.
- `semantic.js` is the canonical place to infer bar orientation, layout,
  segment field, aggregate state, axis state, detail state, and x/y
  geometry from a compiled spec.
- `diff.js` owns bar semantic delta names such as `bar.layout`,
  `bar.orientation`, and `bar.x-geometry`.
- `state.js` reads the diff/semantic result and builds the transition plan,
  including staged updates and intermediate layout specs.
- `render.js` is the bar renderer entry point. Layout-specific drawing belongs
  in `layout/simple.js`, `layout/stacked.js`, or `layout/grouped.js`.
- `render-pattern.js` contains shared D3 join and staged update patterns.
  Bar exit geometry is source-aware: exit direction is determined from the
  existing rect/source step, not the target step's scale. For stacked bars,
  the transition plan's `stack-base` baseline means the segment's `__stack0`
  anchor, so a segment exits back to where it originally grew from.

Point, line, and unit have chart-local authoring, compilation, rendering, and
change rules. Line now owns its cut → move → connect total/series plan and uses
that same plan backward for merge. Point owns its cached summary/detail path.
That Point path is `set view → move points`; combine reuses it backward.
Unit owns a reversible `set view → move units` plan. It preserves matching keys
first, then uses global minimum-travel matching only for unmatched units and
open slots. Shorter trips start before longer trips. None of these rules live
in the core.
Future chart types should use the bar folder as the reference shape when they
need custom multi-step plans, intermediate specs, or inspector metadata.

## Non-Bar Authoring Alignment

Point, line, and unit authoring should follow the bar authoring vocabulary.
Keep the public chaining surface chart-first:

- `bar`: `x`, `y`, `where`, `breakdown`, `rollup`, `layout`, `axis`
- `point`: `x`, `y`, `color`, `size`, `key`, `where`, `flip`, `rollup`,
  `breakdown`
- `line`: `x`, `y`, `color`, `key`, `where`, `breakdown`, `rollup`
- `unit`: `x`, `color`, `key`, `where`, `group`

- shared: `x`, `y`, `channel`, `color`, `size`, `key`, `tooltip`, `sort`,
  `where`, `highlight`, `axis`, and `transition`
- point: `flip`, `breakdown`, and `rollup`
- line: `flip`, `breakdown`, and `rollup`
- unit: `value`, `columns`, `radius`, `group`, and `layout`; supported layouts
  are `grid`, `bar`, `timeline`, and `dodge`. Grouping never silently chooses
  layout or color, and Unit has no summary/detail split or merge.

Compiled authoring specs should be Vega-ish first: `data`, `mark`,
`encoding`, and `transform` stay in the root spec, while VisDelta-only
semantics live under `meta`. Do not add invented Vega-Lite channels such
as `encoding.series`; line grouping is stored in
`meta.state.sceneState.detail.seriesField` and rendered through the
standard `color` encoding.

Point, line, and unit spec compilers live in their chart-type folders:
`src/charts/point/compile.js`, `src/charts/line/compile.js`, and
`src/charts/unit/compile.js`. Each authoring state compiles locally and carries
its own module; the global transition module does not build a chart-specific
compiler map.

## D3 Bar Checklist

This checklist tracks the D3 review findings for the bar chart.

- [x] Use baseline-aware simple bar geometry.
  Horizontal bars use `x = min(x(0), x(v))` and `width = abs(x(v) - x(0))`.
  Vertical bars use `y = min(y(0), y(v))` and `height = abs(y(v) - y(0))`.
- [x] Use baseline-aware grouped bar geometry.
  Grouped enter and exit now return to the zero baseline instead of the chart
  bottom, and the previous vestigial zero-baseline enter hook is now consumed.
- [x] Make stacked bars robust for diverging values.
  Stacked bars use separate positive and negative accumulators, and the
  stacked value domain includes both `__stack0` and `__stack1` extents. Stacked
  enter and exit read the transition plan's `stack-base` baseline and collapse
  to each segment's `__stack0` anchor, not the global zero axis.
- [x] Keep scale, axis, and marks together in coordinate steps.
  Bar layouts pass each x/y step to its axis/grid and its mark geometry, so both
  are evaluated from the same coordinate scale.
- [x] Account for explicit per-step duration in scroll virtual phases.
  If `axis.duration` is authored, virtual scroll timing multiplies it by the
  number of coordinate steps. Default timing still treats the step
  transition duration as the total duration.
- [x] Derive scroll phase timing directly from the transition plan.
  Bar plans expose `plan.totalDuration`, and virtual scroll
  sequencing prefers that value before falling back to authored transition
  duration and stagger defaults.
- [x] Keep `renderBarJoin` as the shared D3 join pattern for bar layouts.
  It remains bar-specific because it owns `rect.sl-bar`, bar lineage,
  baseline enter/exit, and highlight opacity.
- [x] Move each bar layout geometry contract into a small object.
  Simple, grouped, and stacked layouts now pass layout-local geometry contracts
  with `start`, `target`, `applyX`, `applyY`, `apply`, and `exit` hooks into the
  shared bar join pattern.
- [x] Centralize bar layout/state inference.
  `semantic.js` is the canonical source for orientation, layout, segment,
  aggregate, axis, detail, and x/y geometry inference used by render,
  diff, and transition planning.
