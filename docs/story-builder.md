# Story Builder

`story()` returns a `StoryBuilder`: a chainable, immutable-feeling (but
internally mutating) authoring API that produces a compiled story spec via
`.toSpec()`. Every method below returns `this`, so calls chain freely and in
any reasonable order — the builder recompiles steps lazily whenever something
that affects them changes.

```js
import { story, bar } from "scrollylite";

const spec = story()
  .title("…")
  .data(/* … */)
  .layout(/* … */)
  .view(/* … */)
  .add(/* … */)
  .toSpec();
```

## `story(initialSpec?)`

Creates a new builder. `initialSpec`, if given, seeds the internal spec object
(deep-cloned) — useful for extending an existing spec or sharing common
boilerplate (see `story.demo()` pattern in
[examples/weather/specs/shared.js](../examples/weather/specs/shared.js)).

```js
const base = story({ data: { rows: { url: "./data.csv", type: "csv" } } });
```

## Metadata

```js
.schema(value: string)       // Sets `$schema` — a JSON Schema URI for tooling/validation. Optional.
.title(value: string)        // Story title, shown in the header.
.description(value: string)  // Narrative subtitle / summary text.
```

## `.data(name, source)` / `.data(datasets)`

Registers one or more datasets. Two call forms:

```js
.data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })

.data({
  weather:     { url: "./weather_sample.csv", type: "csv" },
  weatherDays: { url: "./weather_days_tidy.csv", type: "csv" }
})
```

Each `source` may be:

- **Remote file**: `{ url: "path/or/URL", type: "csv" | "json" }` — loaded via
  D3's `d3.csv` / `d3.json` at story start
- **Inline rows**: `{ values: [{ field: value, … }, …] }` — used as-is, no
  network request
- **A plain array**: `[{ field: value, … }, …]` — same as `{ values: […] }`

Multiple `.data()` calls merge into `spec.data` (later calls add/override
dataset names; they don't clear earlier ones). Reference a dataset by name
from a chart idiom builder: `bar("weatherDays")`.

## `.layout(presetOrConfig, options?)`

Two call forms:

```js
// Preset shorthand — sets `layout.preset` and merges `options.runtime`
// (or `options.layout`) on top
.layout("floatToText")
.layout("floatToText", { runtime: { offset: 0.58, nav: true, progress: true } })

// Raw config object — merged directly into `layout`
.layout({ preset: "textOverVis", offset: 0.6, nav: true })
```

Either form merges into the existing `spec.layout` (it doesn't replace it), so
you can call `.layout()` more than once to layer options. See
[Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md) for every
field `layout` accepts (presets, `offset`, `nav`, `progress`, `scroll`, …).

## `.theme(themeOrHref, options?)`

Configures the story's visual theme. Use a string when you want ScrollyLite to
load a CSS file for this story:

```js
story()
  .theme("./my-theme.css")
```

Use an object when you want a stylesheet plus CSS variable overrides:

```js
story()
  .theme({
    href: "./my-theme.css",
    background: "#fafafa",
    foreground: "#222",
    accent: "rgb(28, 106, 228)",
    fontFamily: "Inter, sans-serif",
    series: [
      "rgb(28, 106, 228)",
      "rgb(250, 77, 29)",
      "rgb(252, 219, 57)",
      "rgb(3, 185, 118)",
      "rgb(250, 195, 211)",
      "rgb(0, 0, 0)"
    ],
    variables: {
      surface: "#fff",
      "--sl-step-gap": "42px"
    }
  })
```

The string shorthand also accepts overrides as the second argument:

```js
story().theme("./my-theme.css", { accent: "rgb(28, 106, 228)" })
```

Each call merges into `spec.theme`, so you can layer defaults and local
overrides. See [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md#theming)
for the full theme shape and loading behavior.

## `.view(idOrConfig, config?)`

Registers named view(s):

```js
.view("main", { title: "Melbourne weather", height: 540 })

// Shorthand: registers under id "main"
.view({ title: "Melbourne weather", height: 540 })

// Multiple views: repeat the named form
.view("main", { title: "Trend", height: 480 })
.view("detail", { title: "Detail", height: 320 })
```

> The single-object form is the config for `main`, not an id/config map.
> To seed several views at once, use `story({ views: { main: ..., detail: ... } })`.

Each view's `config` typically includes `title` (figure caption) and `height`
(pixel height of the chart canvas) — both are read by the renderer and shell.

## `.action(actions)`

Sets the **default action list** applied to every subsequent `.add()` call
(until you call `.action()` again). Prefer explicit token arrays:

```js
.action(["step", "tooltip"])       // discrete jumps + tooltips
.action(["scroll", "tooltip"])     // scroll-scrubbed transitions + tooltips
.action("step")                    // low-level token form
```

Recognized action values:

| Action     | Meaning |
|------------|---------|
| `"step"`   | Render the step fully on nav-dot clicks, discrete `action()` events, and scroll entry |
| `"scroll"` | Interpolate the transition continuously as the reader scrolls through the step (only applies to steps that have a `transition.scene`) |
| `"tooltip"`| Enable hover tooltips on marks |
| `"enter"`  | Play this step's entrance automatically on load — reserved for the **first** step; the builder adds it for you |

The builder's default is `["step", "tooltip"]`. The very first step always
gets `"enter"` appended automatically, regardless of `.action()` or a
per-step override.

> Calling `.action()` before `.add()` is the clearest pattern. `toSpec()`
> derives all steps from the current builder state, so changing the default
> before `toSpec()` affects the emitted steps.

You can also override one step without changing the story default:

```js
story()
  .action(["step", "tooltip"])
  .add("Baseline", base)
  .add("Scrub this reveal", base.where({ period: "recent" }), {
    action: ["scroll", "tooltip"]
  })
```

## `.add(titleOrDefinition, view?, options?)`

Appends one step. Three call shapes:

```js
// 1) Full definition object — anything you'd put in a compiled step,
//    plus `view` (a chart-state builder or raw view spec)
.add({ title: "…", body: "…", view: bar("rows").x("a").y("b"), action: ["scroll", "tooltip"], code: "…" })

// 2) (title, chartState, optionsObject)
.add("Baseline", bar("rows").x("a").y("b"), {
  body: "Narrative copy shown beside/above the chart.",
  action: ["step", "tooltip"],               // optional per-step override
  code: 'bar("rows").x("a").y("b")'   // optional: source snippet shown in the inspector
})

// 3) (title, chartState, "body text shorthand")
.add("Baseline", bar("rows").x("a").y("b"), "Narrative copy as a plain string")
```

`view` may be:
- a **chart idiom builder** (e.g. `bar(...)`, the result of chaining `.x()`,
  `.where()`, …) — its `.toSpec()` is called for you
- a **raw view spec object** — used as-is (after `externalizeScrollyViewSpec`
  normalization)

`.add()` stores a definition and returns the mutable Story builder; it does not
compile or render on every call. When `.toSpec()` is called:

1. The builder takes the *previous* step's view state and **diffs** it
   against this one, inferring `transition.scene` (see
   [Scenes & Transitions](./scenes-and-transitions.md)).
2. It compiles the view spec and attaches narrative annotation (`title`,
   `description` from `body`).
3. If you passed `code`, it's stored under `inspector.code`
   (shown in the demo's source-code inspector
   panel — handy for tutorials and live-coding walkthroughs).
4. It assigns `action`: your per-step `action` override if present, otherwise
   the current `.action()` default. The first step also receives `"enter"`.
5. It returns the complete compiled step list. Transitions are re-derived for
   that snapshot; changing the default `.action()` before `.toSpec()` affects
   all definitions without a per-step action override.

## `.toSpec()`

Returns a deep clone of the compiled spec — the object you pass to
`createStory()`. Calling it doesn't mutate the builder; you can keep chaining
and call `.toSpec()` again to get an updated snapshot.

```js
const spec = story().title("…")./* … */.toSpec();
await createStory(spec, { target: "#app", d3, aq });
```

## Reusable bases and branching narratives

Because chart-idiom builders are immutable (`.x()` etc. return *new* states),
you can build a `base` chain once and branch off it for each step — exactly
the pattern the bundled examples use:

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");

story()
  .add("Baseline", base.where({ type: "Hot days" }))
  .add("Focus", base.where({ type: "Hot days", period: "recent" }))
  .add("Guide", base.where({ type: "Hot days", period: "recent" }).flip())
  .add("Granularity", base.breakdown("type"))
  .add("Guide: grouped", base.breakdown("type").layout("grouped").flip())
  .toSpec();
```

`base` is never mutated — each `.where()`/`.flip()`/`.breakdown()` call
returns a fresh state, so you can freely branch, reuse, and recombine without
steps leaking state into each other.
