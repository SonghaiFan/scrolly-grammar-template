# Extending with plugins

A **ChartPlugin** is a factory/configuration object. A **ChartIdiom** is the
runtime object it produces: renderer, compiler, supported transition scenes,
and transition planning hooks. They are different objects, not interchangeable
registration arguments.

## Register a plugin

The focused entry avoids importing Story and built-in renderers:

```js
import { defineChartIdiom, registerChartModule } from "scrollylite/plugins";

const plugin = defineChartIdiom({
  key: "area",
  createRenderer: deps => areaRenderer,
  createSpecCompiler: context => areaCompiler,
  prepareSpec: spec => spec,
  scenes: ["focus", "guide", "observation"]
});

registerChartModule({ plugin });
```

`areaRenderer` and `areaCompiler` above stand for your implementations, not
functions supplied by ScrollyLite. Renderer dependencies are injected helpers;
D3 and optional Arquero are supplied to the runtime when creating a visualization.
Compiler context is separate from renderer dependencies.

Alternatively, `registerChartIdiom(idiom)` accepts an already-created runtime
**ChartIdiom**, not the result of `defineChartIdiom()`. Root-package exports
remain available for compatibility but import the full composition API.

Register before calling `transition()` or creating a Story. Pair transitions
snapshot the selected idiom: later registration affects new pairs, not existing
pairs or their `resize()`. Story also snapshots registered idioms at initialization.
Registration is shared only as the source for new instances. Module factories
receive per-instance helper contexts; direct runtime idioms own their dependencies. Importing Story
does not overwrite an explicitly registered idiom with the same built-in key.

## Use a custom visualization

A custom visualization can be a plain `ViewSpec`, or an object with
`toSpec(): ViewSpec`. A chainable builder is optional:

```js
import { transition } from "scrollylite/transition";

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

Both endpoints must resolve to the same idiom. Registering a plugin does not
automatically create an `area()` builder, nor provide cross-idiom morphing.
Internal authoring classes are implementation references, not public package
subpaths; do not import `scrollylite/charts/authoring`.

## Compiler and transition contract

`createSpecCompiler(context)` returns a `SpecCompiler` with a `base(spec)`
normalizer and optional operation compilers. The registered idiom's compiler is
used by both Story rendering and standalone transitions. Scene names currently
include `focus`, `guide`, `granularity`, and `observation`; unsupported scenes
are filtered by the idiom's declared scene list.

Optional hooks on `defineChartIdiom`:

- `transition.plan(previous, next)`: renderer staging plan.
- `transition.intermediateSpecs(previous, next)`: intermediate visualization phases.
- `defaults.margin(spec)`: default chart margins.
- `inspect`: debug metadata.
- `transitionEvaluation`: `"reconstruct"` by default, or explicit `"cached"`.

Cached evaluation is an advanced renderer contract, not a generic performance
switch: the renderer must express motion through the runtime's capturable
property tracks and tolerate reversible phase/endpoint DOM restoration.
Built-in bar opts in. Line, point, unit, and unspecified custom idioms reconstruct
their frame on seek. Validate parity, random reverse seeking, entry/exit,
`resize()`, and cleanup before opting a custom renderer into caching.

## Contributing a built-in idiom

See [the chart folder contract](../src/charts/README.md) and the TypeScript
implementations under `src/charts/{bar,line,point,unit}/`.
Story uses the static manifest; standalone transitions use the lazy loader map
in `src/runtime/chart-registry.ts`. A new built-in must be wired into both.
Run `npm run manifest:check`, `npm test`, and `npm run test:browser`.

`availableChartIdioms()` lists built-in keys plus explicitly registered custom
keys. A listed built-in is available on demand; it need not have been loaded yet.
