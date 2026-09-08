# Interactive reference

This is the canonical map of ScrollyLite's public 0.2 language. It connects immutable visualization declarations, semantic delta, seekable transition evaluation, and optional narrative composition.

For the normative ontology, grammar families, implementation status, missing capabilities, and development milestones, start with the [Language framework and roadmap](/language-framework). This page is the detailed API-level companion.

<div class="ontology-flow">
  <code>Visualization</code><span>to</span><code>Delta</code><span>to</span><code>Transition</code><span>to</span><code>Driver</code>
</div>

<TransitionWorkbench />

The workbench above imports the same built modules that an application imports. Drag the slider, play in either direction, inspect the delta and endpoint specs, then use the Seq controls to move between positions.

## Edit the grammar live

Change any chainable method below and the chart recompiles after a short pause. Choose a preset to explore measure changes, filtering, highlighting, breakdown, orientation, or another chart idiom. The editor runs the real package from this checkout and reports invalid grammar instead of substituting a mock result.

<SyntaxPlayground />

The playground expects two immutable, same-idiom states. Return them as `{ from, to }`; the surrounding driver owns rendering, progress, playback, resize, and cleanup. Press <kbd>Command</kbd> or <kbd>Control</kbd> + <kbd>Enter</kbd> to run immediately.

## Mental model

### Visualization

A visualization is an immutable declaration such as:

```js
const base = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const profit = base.y("profit");
```

`base` and `profit` are independent objects. Chaining does not render and does not touch the DOM. Calling `.toSpec()` produces a serializable `ViewSpec`.

### Delta

A delta compares the meaning of two same-idiom endpoints. It records top-level and semantic changes, including encoding, identity, transforms, focus, guides, and granularity.

```js
import { delta } from "scrollylite/core";

const result = delta(base, profit);

result.changed;
result.deltas;
result.has("encoding");
result.hasDelta("guide");
result.delta("granularity");
result.semantic.previous;
result.semantic.next;
```

`delta()` has no DOM dependency. It is useful for inspection, testing, and higher-level planning.

### Transition

A transition resolves data, selects the matching chart idiom, compiles the endpoints, and creates a controller that can evaluate any normalized frame from 0 through 1.

### Driver

A driver supplies time, progress, or a destination state. It may be a button, slider, scroll position, gesture, route, timer, keyboard command, or application event. Scrolling is one driver, not the definition of the animation system.

## Visualization grammar

All four built-in idioms extend the same immutable authoring base.

| Method | Meaning | Compiled state |
| --- | --- | --- |
| `.data(source)` | Bind rows, `{ values }`, a URL, or a named dataset | `data` |
| `.x(field, options?)` | Bind the x channel | `encoding.x` |
| `.y(field, options?)` | Bind the y channel | `encoding.y` |
| `.channel(name, field, options?)` | Bind an arbitrary channel | `encoding[name]` |
| `.color(valueOrField, options?)` | Bind a literal color or nominal field | `encoding.color` |
| `.size(field, options?)` | Bind a quantitative size channel | `encoding.size` |
| `.key(fieldOrFields)` | Declare stable object identity | `key` |
| `.tooltip(items)` | Declare tooltip fields | `encoding.tooltip` |
| `.sort(field, order?)` | Append a sort transform | `transform[]` |
| `.where(selector)` | Select a semantic subset | focus or filter state |
| `.highlight(selector, options?)` | De-emphasize nonmatching bars | focus state |
| `.guide(config)` | Configure scales, axes, orientation, or staging | guide state |
| `.transition(timing)` | Configure duration, easing, and stagger | transition metadata |
| `.toSpec()` | Compile to a detached view specification | `ViewSpec` |

### Data source forms

```js
bar(rows)                          // Inline row array
bar({ values: rows })              // Explicit inline source
bar("./data/sales.csv")            // URL shorthand
bar({ url: "./data/sales.json" })  // URL object
bar("sales")                       // Named Story or Seq dataset
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

## Chart idioms

### `bar()`

Categorical comparison and composition. X defaults to nominal and y defaults to quantitative. Bar currently has the richest semantic transition support and is the only built-in idiom using cached seek evaluation.

| Method | Purpose |
| --- | --- |
| `.flip(options?)` | Switch vertical and horizontal orientation with optional axis staging |
| `.breakdown(segment, options?)` | Increase granularity into stacked or grouped segments; color remains explicit |
| `.rollup(groupby, options?)` | Aggregate rows into fewer bars |
| `.segment(config)` | Configure tidy or wide-data segmentation, labels, layout, and color |
| `.layout(mode, options?)` | Select simple, grouped, or stacked geometry |
| `.stage(order, options?)` | Configure multi-axis transition order and timing |

### `line()`

Trends and series. X defaults to nominal and y to quantitative. Idiom methods are `.curve()`, `.strokeWidth()`, `.pointSize()`, `.flip()`, `.breakdown(series)`, and `.rollup()`.

### `point()`

Relationships and distributions. Both x and y default to quantitative. Idiom methods are `.pointSize()`, `.radius()`, `.flip()`, `.rollup(groupby)`, and `.breakdown(detail)`.

### `unit()`

One mark per unit or count. Idiom methods are `.value()`, `.label()`, `.columns()`, `.radius()`, `.group()`, `.timeline()`, and `.dodge()`.

See [Chart idioms](/chart-idioms) for every overload and option.

## Standalone transition API

Use `transition()` when you have exactly two same-idiom endpoints and your application owns the trigger.

```js
import * as d3 from "d3";
import { bar } from "scrollylite/bar";
import { transition } from "scrollylite/transition";
import "scrollylite/style.css";

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

## Seq and Story

### `seq()` is a mutable state cursor

Seq stores ordered visualization snapshots, optional narrative text, and a navigation cursor. It does not create a page layout.

```js
const sequence = seq()
  .view({ height: 360 })
  .add(base, "Revenue by category", { title: "Revenue" })
  .add(profit, "Profit by category", { title: "Profit" });

const runtime = await chart(sequence, { target: "#chart", d3 });
sequence.bind({ chart: runtime, text: "#caption" });

sequence.next();
sequence.prev();
sequence.goto(1);
sequence.at(0);
sequence.current;
sequence.index;
sequence.length;
sequence.atStart;
sequence.atEnd;
sequence.unbind();
```

Use Seq for next, previous, and goto behavior around a chart controlled by your application.

### `story()` is a mutable narrative builder

Story composes datasets, layout, theme, named views, narrated steps, inferred transition classifications, and action tokens into a serializable `StorySpec`.

```js
const spec = story()
  .title("Quarterly performance")
  .description("From revenue to margin")
  .data("rows", { values: rows })
  .layout("floatToText", { nav: true, progress: true })
  .theme({ accent: "#1c6ae4" })
  .action(["step", "tooltip"])
  .view("main", { height: 420 })
  .add("Revenue", base, { body: "Gross sales by category." })
  .add("Profit", profit, { body: "The same entities, now measured by profit." })
  .toSpec();
```

Visualization builders are immutable. StoryBuilder is deliberately mutable and returns the same builder while composing. Seq is also mutable because its cursor changes. Call `.toSpec()` to obtain a detached Story snapshot.

## Embedding runtimes

| Runtime | Owns | Public control |
| --- | --- | --- |
| `createStory(spec, options)` | Data, theme, page shell, charts, tooltip, navigation, scroll, resize, and hash restoration | `to()`, `scrollDriver`, `destroy()` |
| `createChart(spec, options)` | Data and one named animated chart | `to()`, `progress()`, `resize()`, `destroy()` |
| `createPage(spec, options)` | Layout shell and empty view targets | Elements and `destroy()` |

Short aliases map directly to these runtimes:

```js
render(spec, options); // createStory
chart(spec, options);  // createChart
page(spec, options);   // createPage
```

The short `render()` and `chart()` forms also accept a Seq.

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
| `scrollylite/core` | DOM-free normalization and semantic delta |
| `scrollylite/bar` | Focused immutable bar authoring |
| `scrollylite/transition` | Pair initialization, seek, play, resize, and destroy |
| `scrollylite/plugins` | Plugin definition and registration |
| `scrollylite/story` | Story, Seq, page and chart embedding, and scrolling |
| `scrollylite` | Compatible complete API |
| `scrollylite/browser` | Complete browser API with global dependency fallback |

Current gzip gates are under 4 KB for the core delta fixture, under 8 KB for bar authoring, and under 35 KB for bar plus transition. These exclude D3, optional Arquero, and CSS.

## Plugin boundary

`ChartPlugin` is a configuration and factory object. `ChartIdiom` is the runtime object produced by that factory.

```js
import { defineChartIdiom, registerChartModule } from "scrollylite/plugins";

const plugin = defineChartIdiom({
  key: "area",
  createRenderer: deps => areaRenderer,
  createSpecCompiler: context => areaCompiler,
  prepareSpec: spec => spec,
  scenes: ["focus", "guide", "observation"],
  transitionEvaluation: "reconstruct"
});

registerChartModule({ plugin });
```

Register before creating a transition or Story. New runtimes snapshot the selected idioms. Registration does not create a builder and does not enable cross-idiom morphing. See [Plugins](/extending-with-plugins) for the renderer and compiler contracts.

## Lifecycle and errors

- Mounting clears and owns the target contents. Failed initialization restores the original nodes.
- Package ESM requires explicit D3. Pass Arquero when transforms are present.
- Call `destroy()` during framework unmount or route disposal.
- Call `resize()` after an external size or theme change that the runtime cannot observe.
- Call `sequence.unbind()` and `sequence.off("change")` when releasing Seq bindings.

Common errors are intentional and actionable:

```text
transition() requires two visualizations of the same chart idiom.
Pass { target, d3 } to transition().
transition(): missing dataset "name".
Cannot navigate an empty Seq.
ScrollyLite target not found: selector
```

## Current boundaries

- Cross-idiom morphing is not supported. Bar-to-line is outside the current contract.
- Bar uses cached frame evaluation. Line, point, unit, and unspecified plugins reconstruct when seeking.
- Focused entries do not yet exist for line, point, and unit authoring.
- Arquero is optional only when no transform pipeline is declared.
- Theme stylesheet leases are cleaned up, but CSS selectors are not isolated through Shadow DOM.
- The browser global build is a convenience complete bundle, not the lightweight integration path.

## Integration checklist

1. Import focused modules when you only need pair transitions.
2. Treat visualization builders as immutable endpoint declarations.
3. Declare a stable key for objects that should persist across states.
4. Use `transition()` for a pair, `seq()` for an ordered cursor, and `story()` for narrative composition.
5. Pass D3 explicitly and Arquero only when transforms require it.
6. Import `scrollylite/style.css` once.
7. Destroy runtimes and unbind Seq references during teardown.
8. Run the release gate against an installed tarball before publishing.
