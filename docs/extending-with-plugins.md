# Add a chart type

Each chart type is an independent module. It owns four things:

1. a chainable builder, such as `area()`;
2. a compiler that turns the builder state into a `ViewSpec`;
3. drawing and chart-specific change rules;
4. a small module reference that connects the state to the runtime.

The generic VisDelta core owns none of these chart-specific details.

## The smallest runtime module

`defineChartType()` describes how one chart type works. `defineChartModule()`
wraps it in a lazy loader:

```js
import { defineChartModule, defineChartType } from "visdelta/plugins";

export const plugin = defineChartType({
  key: "area",
  createRenderer: deps => areaRenderer,
  createSpecCompiler: context => areaCompiler,
  prepareSpec: spec => spec,
  scenes: ["selection", "axis", "mapping"]
});

export const areaModule = defineChartModule({
  key: "area",
  load: async () => ({ plugin })
});
```

`areaRenderer` and `areaCompiler` above stand for your implementations, not
functions supplied by VisDelta. Renderer dependencies are injected helpers;
D3 and optional Arquero are supplied to the runtime when creating a visualization.
Compiler context is separate from renderer dependencies.

The names are intentionally literal:

- **Chart module**: the independently importable chart feature.
- **Chart plugin**: the recipe loaded by that module.
- **Chart type**: the working runtime object created from the recipe.

## Connect a chainable builder

Extend the public `ChartState`, compile the chart locally, and return the module
reference. This is the important no-registration path:

```js
import {
  ChartState,
  compileViewWithCompiler
} from "visdelta/plugins";
import { areaCompiler } from "./compiler.js";
import { areaModule } from "./module.js";

export class AreaState extends ChartState {
  chartModule() {
    return areaModule;
  }

  compileSpec(spec) {
    return compileViewWithCompiler(spec, {}, areaCompiler);
  }

  curve(name) {
    return this.with({ meta: { curve: name } });
  }
}

export function area(data = []) {
  return new AreaState({ mark: "area", data, encoding: {} });
}
```

The consumer imports only the new chart and the generic transition runtime:

```js
import { area } from "@my-charts/area";
import { transition } from "visdelta/transition";

const before = area(rows).x("year").y("sales").key("year");
const after = before.y("profit");
await transition(before, after, { target: "#chart", d3 });
```

Neither `visdelta/core` nor `visdelta/transition` needs to know that Area exists.

## Plain JSON specs

A plain object cannot carry a module reference. Register the module before using
plain `ViewSpec` objects:

```js
import { registerChartModule } from "visdelta/plugins";
import { transition } from "visdelta/transition";
import { areaModule } from "@my-charts/area";

registerChartModule(areaModule);

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
not enable bar-to-area transitions.

`registerChartType(chartType)` is the lower-level form for an already-created
runtime object. New transitions take a snapshot of the selected chart type, so
later registration cannot alter an existing transition or its `resize()`.

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
Built-in bar and point opt in. Line, unit, and unspecified custom chart types
reconstruct their frame on seek. Validate parity, random reverse seeking, entry/exit,
`resize()`, and cleanup before opting a custom renderer into caching.

## Add an official chart folder

See [the chart folder contract](https://github.com/SonghaiFan/visdelta/blob/main/src/charts/README.md) and the TypeScript
implementations under `src/charts/{bar,line,point,unit}/`.
An official chart folder contains `authoring.ts`, `compile.ts`, `plugin.ts`, and
`module.ts`. The module file exports a lazy `chartModule`; the authoring state
returns it from `chartModule()`.

Run `node scripts/sync-chart-manifest.mjs` after adding the folder. The generated
official-chart collection changes; the generic registry does not. The manifest
check fails if a concrete chart import is added to the registry.

The documentation editor discovers `examples/*/scenarios.js` modules by their
exported `chart` key, so a new Lab does not require another branch in the shared
Vue component.

Then run `npm run manifest:check`, `npm test`, and `npm run test:browser`.

`availableChartTypes()` lists modules made available through the complete entry
plus explicitly registered modules. A builder-carried module stays local to its
visualization and does not mutate that global list.
