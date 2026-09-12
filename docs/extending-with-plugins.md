# Add a chart type

A chart type is an independent module. Core should work before that module is
imported and should not change when the module is added.

## Module contract

The module owns its builder, compiler, renderer, matching, transition plan,
axes, examples, and tests.

```js
import { defineChartModule, defineChartType } from "visdelta/plugins";

export const plugin = defineChartType({
  key: "custom",
  createRenderer: deps => customRenderer,
  createSpecCompiler: context => customCompiler,
  prepareSpec: spec => spec,
  scenes: ["selection", "axis", "mapping"]
});

export const customModule = defineChartModule({
  key: "custom",
  load: async () => ({ plugin })
});
```

`customRenderer` and `customCompiler` are implementations supplied by the chart
package. Renderer helpers and D3 are injected; the module must not reach into
another built-in chart.

## Builder contract

A focused builder extends `ChartState`, compiles its own grammar, and returns
its module reference:

```js
import { ChartState, compileViewWithCompiler } from "visdelta/plugins";

class CustomState extends ChartState {
  chartModule() {
    return customModule;
  }

  compileSpec(spec) {
    return compileViewWithCompiler(spec, { scene: [] }, customCompiler);
  }
}

export function custom(data) {
  return new CustomState({ mark: "custom", data, encoding: {} });
}
```

That module reference is the normal path: `custom()` works with
`visdelta/transition` without importing the complete `visdelta` entry or
registering the chart globally.

Use `registerChartModule(customModule)` only for plain JSON specs, because a
plain object cannot carry a module reference.

## Runtime object

`defineChartType()` accepts the chart-owned runtime hooks:

| Hook | Responsibility |
| --- | --- |
| `createRenderer(deps)` | Draw marks and chart-owned axes |
| `createSpecCompiler(context)` | Compile authoring state into a view spec |
| `prepareSpec(spec)` | Normalize chart-specific defaults |
| `resolveTransitionPlan(from, to)` | Match items and define ordered steps |
| `canonicalTransitionPair(from, to)` | Reuse one deterministic reversible path |
| `intermediateSpecs(from, to)` | Add meaningful intermediate chart states |
| `defaultMargin(spec)` | Reserve chart-owned space |
| `transitionEvaluation` | Opt into cached frame evaluation when every animated property is captured |

Only implement hooks the chart needs. Do not add chart-name switches or empty
extension hooks to Core.

## Official chart checklist

An official chart folder lives at `src/charts/<name>/` and contains its
authoring, compile, state, render, plugin, and module files. Then:

1. run `node scripts/sync-chart-manifest.mjs`;
2. add a focused package entry;
3. add authoring and real-browser transition tests;
4. add one real-data lab;
5. update `chart-types.md` and the API reference.

The inventory check keeps built-in lazy loading aligned with chart folders. A
focused-module browser test must prove that no unrelated built-in chart module
loads.
