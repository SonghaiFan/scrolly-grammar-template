# Runtime API

This page documents what happens when you call `createStory()`, the shape of
the object it returns, and how to drive a story programmatically — useful for
custom navigation UI, debugging, analytics hooks, or embedding ScrollyLite
inside a larger app's lifecycle.

Use `createStory()` when you want ScrollyLite to own the whole page
experience: header, text steps, sticky chart, scroll driver, nav, and progress
bar. Use `createPage()` and `createChart()` when you want the layout and the
animated chart to be independent — so you can wire transitions to any trigger
you like (button, slider, route change, agent-controlled UI, …).

## `createStory(spec, options)`

```ts
async function createStory(spec: object, options: CreateStoryOptions): Promise<StoryRuntime>
```

### `options`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `target` | `string \| Element` | no | `"#app"` | CSS selector or DOM node to render into. ScrollyLite clears and owns everything inside it. Throws if a selector matches nothing. |
| `d3` | D3 module | **yes** (ESM entry) | `globalThis.d3` (browser entry only) | The D3 v7+ library. Required for rendering, scales, transitions, easing, and data loading. |
| `aq` | Arquero module | when transforms are used | `globalThis.aq` (browser entry only) | Arquero v8 for the data transform path. Not needed for untransformed data. |
| `debug` | `boolean` | no | `false` | Enables the demo's debug affordances (e.g. the source-code inspector panel) in the rendered shell. |

> **Entry contracts:** `scrollylite` requires explicit D3 and, when transforms
> are used, Arquero. `scrollylite/browser` and the global script delegate to the
> same implementation but fall back to `globalThis.d3`/`globalThis.aq`.

### What it does, step by step

1. **Resolves dependencies** — requires D3; missing Arquero is reported when
   evaluating a declared data transform.
2. **Compiles the spec** via `compileSpec(spec)` — normalizes structure and
   prepares everything the renderer needs. Builder-authored specs already carry
   transitions inferred by `.add()`.
3. **Loads every dataset** declared in `spec.data` in parallel (CSV/JSON via
   D3, or used directly for inline arrays/`values`).
4. **Applies the theme** — waits for any stylesheet declared in `spec.theme`,
   then sets palette, font, accent, axis and grid variables on the target only.
5. **Clears `target`** and renders the **story shell**: header, narrated
   step list, sticky chart figure(s), nav rail (`layout.nav`), progress bar
   (`layout.progress`), and a shared tooltip layer.
6. **Renders step 0**, then wires up:
   - the **scroll driver** (geometry-based native scroll tracking;
     see [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md#scroll-config-reference))
   - **click navigation** on the nav rail
   - **window resize** handling (recomputes chart dimensions and scroll
     measurements)
   - **URL hash restoration** (jumping straight to a step if the page loads
     with `#step-N` in the URL)
7. Returns the `StoryRuntime`.

### Errors

`createStory` throws synchronously (before any async work) if:
- `d3` is missing — `"ScrollyLite requires D3. Pass { d3 } to createStory()."`
- `aq` is missing — `"ScrollyLite data transforms
  require Arquero. Pass { aq } to createStory()."`
- `target` doesn't resolve to an element — `"ScrollyLite target not found:
  <selector>"`
- `spec` isn't an object — `"ScrollyLite requires a story spec object."`

Always `await createStory(...)` (or `.catch()` the promise) so these surface
in your own error handling rather than as unhandled rejections.

## Decoupled embedding: `createPage` + `createChart`

These two functions let you use layout and animated chart independently — the
action system (scroll driver and navigation) is only wired up by `createStory`.

### `createPage(spec, options?)`

Renders only the story shell: header, step text sections, figure containers,
and tooltip layer. No data loading, no charts, no scroll tracking or nav.

```ts
async function createPage(spec: object, options?: {
  target?: string | Element;
  debug?: boolean;
}): Promise<PageRuntime>
```

Returns `{ spec, root, story, steps, views, tooltip, destroy }`.  
The `views` object maps view IDs to the empty `<div>` containers that
`createChart` can target.

### `createChart(spec, options)`

Renders only the animated chart into any target element. No page shell, no
scroll driver, no nav — trigger transitions however you like.

```ts
async function createChart(spec: object, options: {
  target?: string | Element;
  d3: object;
  aq?: object;
  view?: string;
  initialStep?: number;
}): Promise<ChartRuntime>
```

#### `chart.to(indexOrState)`

The primary trigger: animates to step `index` using a natural, timer-driven
D3 transition. Use this for buttons, route changes, keyboard shortcuts, or
any discrete trigger.

```js
nextButton.addEventListener("click", () => chart.to(currentStep + 1));
prevButton.addEventListener("click", () => chart.to(currentStep - 1));
```

#### `chart.progress(index, value)`

Scrubs the transition toward step `index` at `value` from `0` to `1`. Use this
when a slider, gesture, or custom scroll driver owns transition progress:

```js
slider.addEventListener("input", () => {
  chart.progress(2, slider.valueAsNumber);
});
```

#### Example: button-driven chart

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createChart, story, bar } from "scrollylite";
import "scrollylite/style.css";

const spec = story()
  .data("rows", { values: [
    { category: "A", value: 12 },
    { category: "B", value: 18 }
  ]})
  .view("main", { height: 420 })
  .add("Baseline", bar("rows").x("category").y("value").key("category"))
  .add("Highlight B", bar("rows").x("category").y("value").key("category")
    .highlight({ category: "B" }))
  .toSpec();

const chart = await createChart(spec, { target: "#chart", d3, aq });

let step = 0;
document.querySelector("#next").addEventListener("click", () => {
  chart.to(++step);
});
```

#### Example: slider-scrubbed chart

```js
const scrub = document.querySelector("#scrub"); // <input type="range" min="0" max="1" step="0.01">
scrub.addEventListener("input", () => chart.progress(1, scrub.valueAsNumber));
```

## `StoryRuntime`

The object `createStory` resolves to:

```ts
interface StoryRuntime {
  spec: object;                 // The compiled, normalized story spec
  data: Record<string, any[]>;  // Loaded datasets, keyed by name: { weatherDays: [...], … }
  signature: StepSignature[];   // Lightweight per-step metadata for nav/analytics
  to(index: number): void;
  scrollDriver: ScrollDriver;
  destroy(): void;
}
```

### `spec`

The fully compiled spec — the same shape `story().toSpec()` produces, but
with every step's view fully resolved (no authoring shorthand left). Useful
for debugging ("what did my chained builders actually produce?") or for
serializing a runtime story for later replay.

### `data`

A plain object mapping each dataset name to its loaded row array — exactly
what `viewRows()` extracts from for rendering. Handy for verifying a remote
file loaded correctly, or for driving your own visualizations off the same
data.

```js
const runtime = await createStory(spec, { target: "#app", d3, aq });
console.log(runtime.data.weatherDays.length, "rows loaded");
```

### `signature`

An array of lightweight step descriptors — exactly what you need to build
custom navigation UI, a table of contents, or analytics instrumentation
without re-deriving anything from the full compiled spec:

```ts
interface StepSignature {
  index: number;
  id?: string;
  title: string;
  transition: string[];   // inferred scenes for this step, e.g. ["focus", "guide"]
  action: string[];       // e.g. ["scroll", "tooltip"]
}
```

```js
runtime.signature.forEach(({ index, title, transition }) => {
  console.log(`${index}: ${title} — scenes: ${transition.join(", ") || "(none)"}`);
});
```

### `to(index)`

Programmatically jumps the full story to a step with a natural animated
transition. Use it for custom navigation, table-of-contents links, or external
controls that should drive the same rendered story shell:

```js
runtime.to(2);
```

For continuous scrubbing, use the decoupled chart runtime from `createChart()`
and call `chart.progress(index, value)`.

### `scrollDriver`

The active scroll driver instance — currently always the **native** driver
(geometry-based, tracks `window.scrollY`):

```ts
interface ScrollDriver {
  type: "native";
  scrollToStep(index: number, options?: { behavior?: string; progress?: number }): number | null;
  resize(): void;
  refresh(): void;   // alias of resize()
  destroy(): void;
}
```

`scrollToStep(index, options)` programmatically scrolls the page so the given
step lands at `options.progress` (default from `layout.scroll.navigation.progress`,
itself defaulting to `0.98`) using `options.behavior` (default from
`layout.scroll.navigation.behavior`, itself `"instant"`). Returns the
resulting scroll-top in pixels (or `null` if the step doesn't exist).

```js
runtime.scrollDriver.scrollToStep(3, { behavior: "smooth", progress: 0.5 });
```

`resize()`/`refresh()` force a re-measurement (useful after you
programmatically change layout that the driver can't observe, e.g. injecting
content above the story). `destroy()` tears down its scroll/resize listeners
— called automatically by `runtime.destroy()`.

The native driver coalesces invalidations into one animation frame. Scroll and
window-resize events, plus ResizeObserver notifications for document/step size
changes, trigger measurement. It does not run a perpetual frame loop or interval
while idle. Call `refresh()` for position changes that do not resize an observed
element. Without ResizeObserver, scroll/resize/explicit refresh still work.

### `destroy()`

Tears the story down completely: cancels pending animation frames, removes
ScrollyLite's scroll/resize/nav listeners, and destroys the scroll driver.
Call this when removing a story from the page (e.g. in a framework
component's unmount/cleanup hook) to avoid leaking listeners:

```js
const runtime = await createStory(spec, { target: "#app", d3, aq });
// … later, e.g. on component unmount:
runtime.destroy();
```

> `destroy()` does **not** clear `target`'s contents — it only stops
> ScrollyLite's own activity. Clear or replace the target element yourself if
> you're tearing down the DOM as well.

Destruction is idempotent. Story/chart controls reject calls after destruction;
the native driver's refresh/resize/navigation methods become inert. Pending
hash restoration is cancelled, navigation handlers are removed, and owned SVG
transitions are interrupted. Standalone pair `destroy()` also removes its own
markup; this differs from the compatible Story/chart embedding behavior above.

Each host should have one active owner: destroy its previous runtime before
mounting another into the same target. Different targets have independent
Story color maps and plugin snapshots. Theme token cleanup restores the host's
prior inline values, and shared stylesheet leases are reference counted.
External CSS rules themselves remain document-wide.

Story/chart/page initialization is transactional with respect to the host: failed
data loading, theme loading or first rendering rejects the promise and preserves
the previous child nodes (including their event listeners), class and theme
values. It does not restore an already destroyed previous runtime.

## Sequence bindings and cleanup

`seq()` stores snapshots of the visualizations added to it; `at()` and `current`
return inspection copies. Empty-sequence navigation and non-integer indexes throw
without changing the cursor. Out-of-range integer indexes clamp to a valid step.

```js
const sequence = seq().add(first, "First").add(second, "Second");
sequence.bind({ chart: chartRuntime, text: "#caption" }).on("change", onChange);
// On application cleanup:
sequence.unbind().off("change");
chartRuntime.destroy();
```

`unbind()` releases all chart/text references; `off("change")` removes the change
handler. Neither destroys externally owned chart instances.

## Registering chart idioms at runtime

These three functions (re-exported from the package root) manage the
**built-in chart idiom registry** that every `createStory` call shares:

```ts
function registerChartIdiom(idiom: ChartPlugin): void
function registerChartModule(module: { plugin: ChartPlugin }): void
function availableChartIdioms(): string[]
```

```js
import { availableChartIdioms } from "scrollylite";
console.log(availableChartIdioms());   // ["bar", "line", "point", "unit"]
```

See [Extending with Plugins](./extending-with-plugins.md) for how to define
and register your own idiom with `defineChartIdiom`.

## Putting it together: a minimal embedding

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";

const spec = story()
  .title("Demo")
  .data("rows", { values: [{ a: "x", b: 1 }, { a: "y", b: 2 }] })
  .view("main", { height: 420 })
  .add("Baseline", bar("rows").x("a").y("b").key("a"))
  .add("Highlight", bar("rows").x("a").y("b").key("a").highlight({ a: "y" }))
  .toSpec();

let runtime;
async function mount() {
  runtime = await createStory(spec, { target: "#app", d3, aq });
  console.log("steps:", runtime.signature);
}
function unmount() {
  runtime?.destroy();
}
```
