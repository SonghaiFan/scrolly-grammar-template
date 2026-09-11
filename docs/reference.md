# Interactive reference

This is the canonical map of VisDelta's chart-transition language. It connects
immutable chart states, their differences, and seekable transitions.

For the language model, grammar groups, implementation status, missing
capabilities, and development milestones, start with the [Language framework
and roadmap](/language-framework). This page is the detailed API companion.

<div class="ontology-flow">
  <code>Chart state</code><span>to</span><code>Difference</code><span>to</span><code>Transition</code><span>to</span><code>Control</code>
</div>

<TransitionWorkbench />

The workbench above imports the same built modules that an application imports. Drag the slider, play in either direction, and inspect the delta and endpoint specs.

## Edit the grammar live

Change any chainable method below and the chart recompiles after a short pause.
Choose a preset to explore value changes, filtering, highlighting, breakdown,
orientation, or another chart type. The editor runs the real package from this
checkout and reports invalid grammar instead of showing a mock result.

<SyntaxPlayground />

The playground expects two immutable states of the same chart type. Return them
as `{ from, to }`; the surrounding controls own rendering, progress, playback,
resize, and cleanup. Press <kbd>Command</kbd> or <kbd>Control</kbd> + <kbd>Enter</kbd>
to run immediately.

## Mental model

### Chart state

A visualization is an immutable declaration such as:

```js
const base = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const profit = base.y("profit");
```

`base` and `profit` are independent objects. Chaining does not render and does not touch the DOM. Calling `.toSpec()` produces a serializable `ViewSpec`.

### Difference

A delta compares two states of the same chart type. It records changes to data,
field mappings, matching keys, filters, axes, layout, and detail.

```js
import { delta } from "visdelta/core";

const result = delta(base, profit);

result.changed;
result.deltas;
result.has("encoding");
result.hasDelta("encoding.y");
result.delta("data");
result.semantic.previous;
result.semantic.next;
```

`delta()` has no DOM dependency. It is useful for inspection, testing, and higher-level planning.

### Transition

A transition resolves data, selects the matching chart type, compiles the
endpoints, and creates a controller that can evaluate any normalized frame from
0 through 1.

### Control

A control supplies time, progress, or a destination state. It may be a button,
slider, scroll position, gesture, route, timer, keyboard command, or application
event. Scrolling is one control, not the definition of the animation system.

## Chart grammar

All five built-in chart types share the same base methods. Every method creates
a new chart state and leaves the previous state untouched.

| Method | Meaning | Saved as |
| --- | --- | --- |
| `.data(source)` | Bind rows, `{ values }`, a URL, or a named dataset | `data` |
| `.x(field, options?)` | Bind the x channel | `encoding.x` |
| `.y(field, options?)` | Bind the y channel | `encoding.y` |
| `.channel(name, field, options?)` | Bind an arbitrary channel | `encoding[name]` |
| `.color(valueOrField, options?)` | Bind a literal color or nominal field | `encoding.color` |
| `.size(field, options?)` | Bind a quantitative size channel | `encoding.size` |
| `.key(fieldOrFields)` | Tell VisDelta how to match the same item | `key` |
| `.tooltip(items)` | Declare tooltip fields | `encoding.tooltip` |
| `.sort(field, order?)` | Append a sort transform | `transform[]` |
| `.where(selector)` | Keep matching rows and remove the others | filter transform |
| `.focus(selector)` | Keep every row and fit the visible range to a subset | selection state |
| `.highlight(selector, options?)` | De-emphasize nonmatching marks | selection state |
| `.axis(config)` | Configure scales, axes, orientation, or transition order | axis state |
| `.transition(timing)` | Configure duration, easing, and stagger | transition metadata |
| `.toSpec()` | Return the plain JavaScript object behind the chart state | `ViewSpec` |

### Data source forms

```js
bar(rows)                          // Inline row array
bar({ values: rows })              // Explicit inline source
bar("./data/sales.csv")            // URL shorthand
bar({ url: "./data/sales.json" })  // URL object
bar("sales")                       // Named dataset supplied in transition options
```

### Channel objects

Use a string for the common case or a complete channel object for type, title, scale, domain, sorting, aggregation, or binning.

```js
base.x({
  field: "category",
  type: "nominal",
  title: "Product category",
  sort: "ascending",
  scale: { padding: 0.24 }
});
```

## Chart types

### `area()`

Ordered magnitude and composition. X defaults to nominal and y to quantitative.
Chart-specific methods are `.curve()`, `.connect()`, `.baseline()`,
`.breakdown(series)`, and `.rollup()`. Stacked Area computes explicit lower and
upper boundaries for every layer. Area curve names are the exact D3 exports;
`curveBundle` is Line-only in D3 and is therefore rejected for Area.

### `bar()`

Categorical comparison and composition. X defaults to nominal and y defaults to
quantitative. Bar currently has the richest transition support. Area, Bar, and
Point use cached frame evaluation.

| Method | Purpose |
| --- | --- |
| `.flip(options?)` | Switch vertical and horizontal orientation; optionally set x/y step order |
| `.breakdown(segment, options?)` | Split totals into stacked or grouped detail; color remains explicit |
| `.rollup(groupby, options?)` | Aggregate rows into fewer bars |
| `.segment(config)` | Configure tidy or wide-data segmentation, labels, layout, and color |
| `.layout(mode, options?)` | Select simple, grouped, or stacked geometry |

### `line()`

Trends and series. X defaults to nominal and y to quantitative. Chart-specific
methods are `.curve()`, `.connect()`, `.strokeWidth()`, `.pointSize()`, `.flip()`,
`.breakdown(series)`, and `.rollup()`.

`.curve()` accepts the exact D3 curve export names, such as `"curveLinear"`,
`"curveMonotoneX"`, `"curveNatural"`, and `"curveStep"`. It does not accept
VisDelta-specific aliases.

### `point()`

Relationships and distributions. Both x and y default to quantitative.
Chart-specific methods are `.pointSize()`, `.radius()`, `.flip()`,
`.rollup(groupby)`, and `.breakdown(detail)`.

### `unit()`

One mark per unit or count. Chart-specific methods are `.value()`, `.label()`,
`.columns()`, `.radius()`, `.group()`, `.timeline()`, and `.dodge()`.

See [Chart types](/chart-types) for every overload and option.

## Standalone transition API

Use `transition()` when you have exactly two states of the same chart type and
your application owns the trigger.

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { transition } from "visdelta/transition";
import "visdelta/style.css";

const change = await transition(base, profit, {
  target: "#chart",
  d3,
  height: 360
});

change.progress(0.4);
change.play({ duration: 900 });
change.play({ from: 1, to: 0 });
change.pause();
change.resize();
change.destroy();
```

### Transition options

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `target` | `string \| Element` | yes in practice | Mount target, default `#app` |
| `d3` | D3 module | yes | Rendering, scales, loading, and transition evaluation |
| `aq` | Arquero module | with transforms | Data transform evaluation |
| `data` | named source map | for named endpoints | Resolves `.data("name")` declarations |
| `height` | number | no | Explicit chart height |
| `debug` | boolean | no | Runtime debugging affordances where supported |

### Controller contract

| Member | Contract |
| --- | --- |
| `from`, `to` | Defensive copies of the endpoint specs |
| `delta` | Complete semantic diff |
| `view` | Mounted chart element |
| `value` | Current normalized progress |
| `progress(value)` | Pause playback, clamp the value, and synchronously show the frame |
| `play({ duration, from, to })` | Animate over the requested progress interval |
| `pause()` | Cancel active playback without changing the frame |
| `resize()` | Recompile at current size and theme while retaining progress and data |
| `destroy()` | Stop owned work, remove the transition surface, and release references |

`progress()`, `play()`, `pause()`, and `resize()` return the controller for chaining. `destroy()` is idempotent.

## Data and transforms

D3 loads inline, CSV, and JSON data. Arquero is required only when the resolved view contains transforms. Entries execute in declared array order and invalid grammar throws instead of falling back silently.

| Transform | Purpose |
| --- | --- |
| `filter` | Match `equal`, `notEqual`, `oneOf`, `gt`, `gte`, `lt`, or `lte` conditions |
| `timeUnit` | Derive a supported calendar unit, currently month |
| `fold` | Convert wide columns to tidy rows |
| `bin` | Bucket quantitative values |
| `aggregate` | Group and compute count, sum, mean, min, max, or median |
| `sort` | Sort by one or more fields |
| `limit` | Keep the first nonnegative number of rows |

See [Data sources](/data-sources-and-transforms) and the [strict transform grammar](/data-transforms).

## Public module boundaries

| Entry | Responsibility |
| --- | --- |
| `visdelta/core` | DOM-free normalization and semantic delta |
| `visdelta/area` | Focused immutable area authoring |
| `visdelta/bar` | Focused immutable bar authoring |
| `visdelta/point` | Focused immutable point authoring |
| `visdelta/line` | Focused immutable line authoring |
| `visdelta/transition` | Pair initialization, seek, play, resize, and destroy |
| `visdelta/plugins` | Chart-module building blocks and plain-spec registration |
| `visdelta/composition` | Adapter contract used by external control packages |
| `visdelta` | Visualization grammar, delta, transition, and plugin API |
| `visdelta/browser` | Transition API with browser-global dependency fallback |

Current gzip gates are under 4 KB for the core delta fixture, under 8 KB for
Area, Point, and Line authoring, under 9 KB for Bar authoring, and under 35.5 KB
for Bar plus transition. These exclude D3, optional Arquero, and CSS.

## Chart module boundary

An imported chainable chart carries its own lazy `ChartModule`. The generic
transition entry therefore does not import or name any concrete chart type.
Use registration only when the states are plain JSON and cannot carry a module.

```js
import {
  defineChartModule,
  defineChartType,
  registerChartModule
} from "visdelta/plugins";

const plugin = defineChartType({
  key: "area",
  createRenderer: deps => areaRenderer,
  createSpecCompiler: context => areaCompiler,
  prepareSpec: spec => spec,
  scenes: ["selection", "axis", "mapping"],
  transitionEvaluation: "reconstruct"
});

const areaModule = defineChartModule({
  key: "area",
  load: async () => ({ plugin })
});

registerChartModule(areaModule); // needed for plain { mark: "area", ... } specs
```

For a chainable module, make its state return `areaModule` from `chartModule()`;
then no registration is required. `ChartPlugin` is the loaded recipe and
`ChartType` is its per-runtime working object. See [Add a chart type](/extending-with-plugins)
for the full builder, compiler, and renderer contract.

## Lifecycle and errors

- Mounting clears and owns the target contents. Failed initialization restores the original nodes.
- Package ESM requires explicit D3. Pass Arquero when transforms are present.
- Call `destroy()` during framework unmount or route disposal.
- Call `resize()` after an external size or theme change that the runtime cannot observe.

Common errors are intentional and actionable:

```text
transition() requires two states of the same chart type.
Pass { target, d3 } to transition().
transition(): missing dataset "name".
VisDelta target not found: selector
```

## Current boundaries

- Transitions between different chart types are not supported. Bar-to-line is outside the current contract.
- Bar and point use cached frame evaluation. Line, unit, and unspecified plugins reconstruct when seeking.
- A focused entry does not yet exist for unit authoring.
- Arquero is optional only when no transform pipeline is declared.
- The composition adapter is deliberately lower level and is not a beginner API.
- CSS selectors are not isolated through Shadow DOM.

## Integration checklist

1. Import focused modules when you only need pair transitions.
2. Treat visualization builders as immutable endpoint declarations.
3. Declare a stable key for objects that should persist across states.
4. Use `transition()` for a pair and let the application own the control.
5. Pass D3 explicitly and Arquero only when transforms require it.
6. Import `visdelta/style.css` once.
7. Destroy transition controllers during teardown.
8. Run the release gate against an installed tarball before publishing.
