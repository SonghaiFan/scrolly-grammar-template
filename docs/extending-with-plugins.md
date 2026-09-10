# Extending with plugins

A **ChartPlugin** is a recipe for adding a chart type. A **ChartType** is the
working chart object created from that recipe. It knows how to prepare data,
draw the chart, and plan supported changes. These are two different objects.

## Register a plugin

The focused entry avoids importing built-in renderers:

```js
import { defineChartType, registerChartModule } from "visdelta/plugins";

const plugin = defineChartType({
  key: "area",
  createRenderer: deps => areaRenderer,
  createSpecCompiler: context => areaCompiler,
  prepareSpec: spec => spec,
  scenes: ["selection", "axis", "mapping"]
});

registerChartModule({ plugin });
```

`areaRenderer` and `areaCompiler` above stand for your implementations, not
functions supplied by VisDelta. Renderer dependencies are injected helpers;
D3 and optional Arquero are supplied to the runtime when creating a visualization.
Compiler context is separate from renderer dependencies.

Alternatively, `registerChartType(chartType)` accepts an already-created runtime
**ChartType**, not the result of `defineChartType()`.

Register before calling `transition()`. Pair transitions
snapshot the selected chart type: later registration affects new pairs, not
existing pairs or their `resize()`.
Registration is shared only as the source for new instances. Module factories
receive per-instance helper contexts; direct runtime chart types own their
dependencies.

## Use a custom visualization

A custom visualization can be a plain `ViewSpec`, or an object with
`toSpec(): ViewSpec`. A chainable builder is optional:

```js
import { transition } from "visdelta/transition";

const from = {
  mark: "area",
  data: { values: rows },
  key: "year",
  encoding: {
    x: { field: "year", type: "temporal" },
    y: { field: "sales", type: "quantitative" }
  }
};
const to = { ...from, encoding: {
  ...from.encoding, y: { field: "profit", type: "quantitative" }
} };
const change = await transition(from, to, { target: "#chart", d3 });
```

Both endpoints must resolve to the same chart type. Registering a plugin does
not automatically create an `area()` builder or a bar-to-area transition.
Internal authoring classes are implementation references, not public package
subpaths; do not import `visdelta/charts/authoring`.

## Compiler and transition contract

`createSpecCompiler(context)` returns a `SpecCompiler` with a `base(spec)`
normalizer and optional operation compilers. The registered chart type's compiler is
used by transitions. Change labels currently
include `selection`, `axis`, `detail`, and `mapping`; unsupported scenes
are filtered by the chart type's declared scene list.

Optional hooks on `defineChartType`:

- `transition.plan(previous, next)`: returns matching information, enter/exit
  actions, ordered steps, and timing.
- `transition.intermediateSpecs(previous, next)`: intermediate visualization phases.
- `defaults.margin(spec)`: default chart margins.
- `inspect`: debug metadata.
- `transitionEvaluation`: `"reconstruct"` by default, or explicit `"cached"`.

Cached evaluation is an advanced renderer contract, not a generic performance
switch: the renderer must express motion through the runtime's capturable
property changes and tolerate reversible phase/endpoint DOM restoration.
Built-in bar opts in. Line, point, unit, and unspecified custom chart types reconstruct
their frame on seek. Validate parity, random reverse seeking, entry/exit,
`resize()`, and cleanup before opting a custom renderer into caching.

## Contributing a built-in chart type

See [the chart folder contract](https://github.com/SonghaiFan/visdelta/blob/main/src/charts/README.md) and the TypeScript
implementations under `src/charts/{bar,line,point,unit}/`.
The main entry uses the static manifest; focused transitions use the lazy loader
map in `src/runtime/chart-registry.ts`. A new built-in must be wired into both.
Run `npm run manifest:check`, `npm test`, and `npm run test:browser`.

`availableChartTypes()` lists built-in keys plus explicitly registered custom
keys. A listed built-in is available on demand; it need not have been loaded yet.
