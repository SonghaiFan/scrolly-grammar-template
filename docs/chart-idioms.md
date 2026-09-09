# Chart Idioms

VisDelta ships four built-in chart idioms — `bar`, `line`, `point`, `unit`
— each a chainable builder that compiles to a view spec via `.toSpec()`.

```js
import { bar, line, point, unit } from "visdelta";

bar("dataset")     // → BarState
line("dataset")    // → LineState
point("dataset")   // → PointState
unit("dataset")    // → UnitState
```

All four extend a common `ChartState` base (called `IdiomState` internally),
so most encoding/filtering/styling methods work identically across idioms.
This page documents the shared methods first, then each idiom's specific
methods, defaults, and example progressions.

> **Immutability:** every chainable method returns a *new* state object. The
> original is untouched, so you can build a `base` chart and branch from it
> freely; external composition code can arrange those immutable states into a narrative.

---

## Shared methods (all idioms)

### `.data(name)`

Switches the bound dataset (rarely needed mid-chain — usually set by the
factory: `bar("weatherDays")`).

### `.x(field, options?)` / `.y(field, options?)`

Bind the x/y encoding channel. `field` may be:

- a **string** field name — `"decade"` (auto-titled via `titleize`, e.g.
  `"hot_days"` → `"Hot days"`)
- a **channel object** — `{ field: "decade", title: "Decade", type: "ordinal" }`
  for full control

`options` merges into the channel: `{ title, type, scale, … }`.

Default channel `type` differs per idiom (documented in each idiom's section
below) — e.g. bar's `.x()` defaults to `"nominal"`, point's `.x()`/`.y()`
default to `"quantitative"`.

```js
bar("rows").x("decade")                                  // { field: "decade", title: "Decade", type: "nominal" }
bar("rows").x({ field: "decade", title: "By Decade" })   // explicit override
bar("rows").y("count", "Total count")                    // shorthand: string 2nd arg → { title }
```

<SyntaxPlayground initial="measure" compact />

### `.channel(name, field, options?)`

Generic escape hatch for binding any encoding channel by name — useful for
idiom-specific or custom channels not covered by `.x()`/`.y()`/`.color()`/etc.

```js
bar("rows").channel("opacity", "confidence", { type: "quantitative" })
```

### `.color(valueOrField, options?)`

Three forms:

```js
.color("#b05d3b")                  // literal value → { value: "#b05d3b" }
.color("type")                     // field encoding → { field: "type", type: "nominal" }
.color({ field: "type", domain: ["Hot days", "Cold days"], range: [...] })
```

VisDelta also supports **composite hue + luminance** color encodings —
useful for showing two dimensions (e.g. category *and* time period) through
one color channel:

```js
.color({
  hue:       { value: "#b05d3b" },                       // fixed hue, or { field, domain, range }
  luminance: { field: "period", domain: ["early", "middle", "recent"], lightness: [18, 0, -18] }
})
```

### `.size(field, options?)`

Binds a quantitative size channel (point radius, mark scale, …):

```js
point("rows").size("population")
```

### `.key(fields)`

Sets the **semantic identity key** — the field(s) that uniquely identify a
"thing" the reader should track across transitions. Single field collapses to
a string; multiple fields stay an array:

```js
.key("decade")               // → key: "decade"
.key(["decade", "type"])     // → key: ["decade", "type"]
```

See [Concepts → Semantic identity](./concepts.md#semantic-identity-key) for
why this matters and how to choose a good key.

### `.tooltip(items)`

Configures hover tooltips. Accepts a single field, an array, mixing strings
and objects:

```js
.tooltip("count")                                    // → [{ field: "count", title: "Count" }]
.tooltip(["decade", "count"])
.tooltip([{ field: "count", title: "Total Days" }, "period"])
```

String items are auto-titled; object items pass through as-is (`{ field,
title, format, … }`).

### `.sort(field, order?)`

Sorting changes the rendered row/category order, not the automatic color mapping or legend order. Automatic domains are inferred from the source after data-shaping transforms (such as fold and aggregate), excluding sort, filter, and limit. Explicit color `domain` and `range` still take precedence; declaring a different color mapping can intentionally change colors during a sort transition.

Appends a `{ sort: { field, order } }` transform. `order` is `"ascending"`
(default) or `"descending"`. Multiple `.sort()` calls accumulate in the
transform pipeline, applied in order.

```js
bar("rows").x("decade").y("count").sort("year")
bar("rows").sort("count", "descending")
```

### `.transition(timing)`

Overrides transition timing for this view. `timing` merges into the spec's
`transition` block:

```js
.transition({ duration: 1200, ease: "cubicInOut", stagger: { step: 40, max: 600 } })
```

### `.where(selector)`

Declare a selected subset. Bar accumulates per-field constraints (see its section
below); point and unit filter rows. Line's default behavior crops the displayed
range while retaining source rows. `.filter()` is not a public builder method.
For low-level filtering, use `{ filter: ... }` entries in a raw view spec.

`selector` shapes:

```js
.where({ type: "Hot days" })                           // shorthand: single field-equals
.where({ field: "type", equal: "Hot days" })           // explicit selector object
.where(null)                                            // clear the filter (bar only — see below)
```

<SyntaxPlayground initial="filter" compact />

### `.highlight(selector, options?)`

On **bar**, keeps all rows rendered but visually de-emphasizes (fades) the
non-matching ones. Other built-in builders currently store highlight metadata
but do not render selective opacity; do not rely on it for line/point/unit:

```js
.highlight({ type: "Cold days" })                       // default fade opacity
.highlight({ type: "Cold days" }, { opacity: 0.15 })    // custom faded opacity
```

<SyntaxPlayground initial="highlight" compact />

Internally this sets `state.focus = { mode: "highlight", filter: selector,
opacity? }` and infers a `focus` scene.

### `.guide(config)`

Generic guide-state setter — controls how the same data is *read*: scale
type, orientation, axis config, staging order for multi-stage transitions.
Most of the time you'll reach for the higher-level `.flip()` instead, but
`.guide()` is the raw escape hatch:

```js
.guide({ y: { scale: { type: "log" } } })
.guide({ flip: true, staging: { order: ["y", "x"], duration: 500 } })
```

Infers a `guide` scene.

---

## Bar — `bar(dataset)`

A categorical bar chart. Defaults: `mark: "bar"`, `.x()` type `"nominal"`,
`.y()` type `"quantitative"`.

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");
```

### `.where(selector)` — richer on bar

Bar's `.where()` does more than filter rows — it also tries to keep the
narrative coherent as the selected category changes:

- **Accumulates constraints per field**: calling `.where({ period: "recent" })`
  after `.where({ type: "Hot days" })` keeps both constraints (each new
  selector replaces only the constraint on the *same* field).
- **Infers semantic identity** when filtering on a "measure-like" field
  (`type`, `kind`, or any field ending in `_type`/`_kind`): it sets
  `key: [categoryField, measureField]` and a `semanticKey` descriptor, so
  switching `{ type: "Hot days" }` → `{ type: "Cold days" }` reads as *the
  same bars, showing a different measure* rather than a totally new chart.
- **Updates the y-axis title** to follow the selected measure value (e.g.
  selecting `{ type: "Cold days" }` retitles the y-axis to "Cold days") —
  but only while the title hasn't been manually overridden.
- **`.where(null)`** clears all constraints.

```js
base.where({ type: "Hot days" })                          // first selection
base.where({ type: "Hot days", period: "recent" })        // adds a second constraint
base.where({ type: "Cold days" })                         // swaps the `type` constraint, retitles y-axis
base.where(null)                                           // clears everything
```

For a plain filter without bar's extra authoring bookkeeping, supply a raw
view spec with `transform: [{ filter: ... }]`. It still contributes to the
endpoint delta and focus inference.

### `.flip(options?)`

Swaps the bars from vertical to horizontal (rotates the guide). Infers a
`guide` scene and triggers bar's signature **two-stage y-then-x transition**
(axes restage in sequence rather than jumping at once).

```js
.flip()
.flip({ domain: ["Cold days", "Hot days"] })               // pin the flipped axis's domain
.flip({ order: ["x", "y"] })                                // reverse the staging order
.flip({ staging: { duration: 600, stagger: { step: 30, max: 300 } } }) // customize timing
```

`options`:
| Key | Effect |
|---|---|
| `domain` / `scale.domain` | Fixes the domain of the flipped scale |
| `scale` | Merges into the guide's scale config |
| `order` / `stage` / `staging.order` | Staging order, default `["y", "x"]` |
| (staging timing via `staging`/`stage` object) | `{ duration, stagger }` |

<SyntaxPlayground initial="flip" compact />

### `.breakdown(segment?, options?)`

Splits one aggregate bar per category into **segments** by another field —
the canonical "granularity increase" move (one bar → stacked/grouped
segments). Infers a `granularity` scene.

This changes geometry and grain only. It does not implicitly encode the
segment field with color: add `.color("type")` or pass an explicit `color`
option when color carries meaning. Without a color declaration, all segments
are black and no legend is drawn. The compiled spec keeps
the grouping field in `encoding.detail`, independently of `encoding.color`.

The stacked split transition establishes the final segment geometry first. A
1px contrast-aware seam draws outward from each internal boundary, then the
segment fills reveal over the fading aggregate bar. The seam derives its
visible contrast from the pixels behind it, so it remains legible over black or
explicitly encoded colors. With no color encoding, the seams distinguish the
otherwise-black segments.

```js
base.breakdown()                  // geometry only; black fill, no legend
base.breakdown("type").color("type") // explicitly encode the segment field
base.breakdown("type", { layout: "grouped", op: "mean" })
base.breakdown("type", { color: TEMPERATURE_HUE, tooltip: [...] })
```

`options`:
| Key | Default | Effect |
|---|---|---|
| `category` | current x field | Field that stays on the category axis |
| `value` | current y field, else `"count"` | Measure being aggregated |
| `by` | `[category, segment]` | Aggregation grouping fields |
| `layout` | `"stacked"` | `"stacked"` or `"grouped"` |
| `op` | `"sum"` | Aggregation operator: `sum`, `mean`, `count`, `min`, `max`, `median` |
| `title` | titleized `value`, or `false` to skip retitling | Y-axis title |
| `color` | — | Color encoding for segments |
| `tooltip` | — | Tooltip config |

<SyntaxPlayground initial="split" compact />

### `.rollup(groupby?, options?)`

The inverse of `.breakdown()`: aggregates multiple rows/segments back into
**fewer, coarser bars**. Infers a `granularity` scene.

```js
base.rollup("decade", { title: "Average days", op: "mean" })
base.rollup(["decade", "period"])
base.rollup({ by: "decade", value: "count", as: "total", op: "sum", color: "#b05d3b" })
```

`options` (or the 2nd positional argument as an options object):
| Key | Default | Effect |
|---|---|---|
| `groupby` / `by` | current x field | Grouping field(s) |
| `value` | current y field, else `"count"` | Field being aggregated |
| `as` | `value` | Output field name |
| `op` | `"sum"` | Aggregation operator |
| `title` | — | Y-axis title override |
| `color` | — | Re-applies `.color()` on the result |

### `.segment(fieldOrConfig?, config?)`

Lower-level granularity primitive behind `.breakdown()` — directly configures
a multi-field "long format" segmentation, including **wide-to-long folding**
(turning columns like `hot_days`/`cold_days` into rows). Infers a
`granularity` scene. Most stories should prefer `.breakdown()`/`.rollup()`;
reach for `.segment()` when you need to fold wide columns or set custom
labels/domains directly.

```js
base.segment("type")    // tidy-data shorthand — equivalent to most `.breakdown()` use
base.segment({
  fields: ["hot_days", "cold_days"],     // wide columns to fold into long rows
  segment: "type", value: "count",
  labels: { hot_days: "Hot days", cold_days: "Cold days" },
  layout: "stacked",
  color: TEMPERATURE_HUE
})
```

### `.layout(layout, options?)`

Switches between `"stacked"` and `"grouped"` segment layouts (only meaningful
after `.breakdown()`/`.segment()`). Infers a `guide` scene.

```js
base.breakdown("type").layout("grouped")
base.breakdown("type").layout("grouped", { staging: { duration: 500 } })
```

### `.stage(order, options?)`

Directly controls multi-stage transition **staging order and timing** —
the same mechanism `.flip()` uses internally. Infers a `guide` scene.

```js
base.stage(["y", "x"])
base.stage(["x", "y"], { duration: 700, stagger: 40 })
```

### Bar state family

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");

const states = {
  baseline: base.where({ type: "Hot days" }),
  focus: base.where({ type: "Hot days", period: "recent" }),
  flip: base.where({ type: "Hot days", period: "recent" }).flip(),
  split: base.breakdown("type"),
  highlight: base.breakdown("type").highlight({ type: "Cold days" }),
  grouped: base.breakdown("type").layout("grouped").flip(),
  rollup: base.rollup("decade", { title: "Average days", op: "mean" })
};

const pair = await transition(states.baseline, states.focus, { target, d3, aq });
```

---

## Line — `line(dataset)`

A line chart for trends over an ordered axis. Defaults: `mark: "line"`,
`.x()` type `"nominal"`, `.y()` type `"quantitative"`.

```js
const base = line("weather").x("decade").y("hot_days").key("decade");
```

<SyntaxPlayground initial="line" compact />

### `.curve(value)`

Sets the D3 curve interpolation, e.g. `"linear"`, `"monotone"`, `"natural"`,
`"step"`, `"basis"` (any name resolvable by VisDelta's curve lookup).

```js
.curve("monotone")
```

### `.strokeWidth(value)` / `.pointSize(value)`

Stroke width in pixels, and the radius of circles drawn at data points.

```js
.strokeWidth(3).pointSize(4)
```

### `.flip(options?)`

Swaps x/y axes. Infers a `guide` scene.

```js
.flip()
.flip({ x: { scale: { type: "log" } }, order: ["x", "y"] })
```

`options`: `x`/`y` (per-axis guide overrides), `order`/`stage`/`staging`
(staging order, default `["x", "y"]`, plus `{ duration, stagger }` timing).

### `.breakdown(field, options?)`

Splits a single line into **multiple series** — one line per unique value of
`field`. Infers a `granularity` scene (`mode: "series"`).

```js
base.breakdown("period")
base.breakdown("period", { color: ["#b05d3b", "#888", "#536a9e"] })   // explicit range
base.breakdown("period", { color: PERIOD_LUMINANCE_COLOR })            // composite color config
```

### `.rollup(groupbyOrOptions?, options?)`

The inverse: merges multiple series back into a **single line**. Infers a
`granularity` scene (`mode: "single"`).

```js
base.breakdown("period").rollup()
base.breakdown("period").rollup({ color: "#536a9e" })
```

### Line state family

```js
const base = line("weather").x("decade").y("hot_days").key("decade");
const cold = base.y("cold_days").color(COLD_COLOR);

const states = [
  base,
  base.where({ period: "recent" }),
  base.guide({ y: { scale: { type: "log" } } }),
  cold,
  cold.breakdown("period"),
  cold.breakdown("period").rollup()
];
```

---

## Point — `point(dataset)`

A scatterplot. Defaults: `mark: "point"`, `.x()`/`.y()` type
`"quantitative"`.

```js
const base = point("weather").x("tmin").y("tmax").key("decade");
```

<SyntaxPlayground initial="point" compact />

### `.pointSize(value)` / `.radius(value)`

Set the circle size (`radius` is an alias for `pointSize`).

```js
.pointSize(6)
```

### `.flip(options?)`

Swaps x/y axes. Infers a `guide` scene. Same `options` shape as line's
`.flip()` (`x`, `y`, `order`/`stage`/`staging`).

### `.rollup(groupby, options?)`

Aggregates individual points into **larger summary circles** — e.g. one
circle per period instead of one per year. Infers a `granularity` scene
(`mode: "aggregate"`).

```js
base.rollup("period")
base.rollup(["period", "region"], {
  countAs: "n",
  sizeRange: [6, 36],          // map aggregate count → circle radius range
  x: { op: "mean" },           // aggregation config per axis (idiom-specific)
  y: { op: "mean" }
})
```

`options`: `key` (identity for the aggregated marks, defaults from `groupby`),
`x`/`y` (per-axis aggregation config), `countAs` (name for the synthesized
count field), `sizeRange` (`[min, max]` radius mapping for aggregate size).

### `.breakdown(detail?, options?)`

The inverse of `.rollup()` — reveals **finer-grained detail** within an
aggregated view (e.g. expand period-level circles into year-level points
while preserving the higher-level identity). Infers a `granularity` scene
(`mode: "detail"`).

```js
base.rollup("period").breakdown("year")
base.breakdown({ detail: "year", key: "period" })
```

### Point state family

```js
const base = point("weather").x("tmin").y("tmax").key("decade");

const states = [
  base,
  base.where({ period: "recent" }),
  base.x("hot_days").y("cold_days"),
  base.x("hot_days").y("cold_days").rollup("period"),
  base.x("hot_days").y("cold_days").rollup("period").breakdown("decade")
];
```

---

## Unit — `unit(dataset)`

A unit/isotype chart: each row (or count) is drawn as a small repeated mark
(typically a circle) — useful for "32 circles = 32 hot days" style pictograms.
Defaults: `mark: "unit"`.

```js
const base = unit("weather").x("year").y("hot_days").key("decade")
  .value("hot_days").label("decade");
```

<SyntaxPlayground initial="unit" compact />

### `.value(field, options?)`

The field whose **count** determines how many unit marks are drawn for each
row/group.

```js
.value("hot_days")
.value("hot_days", { maxUnits: 50 })   // cap rendered units per group (perf / readability)
```

### `.label(field)`

Field whose value is shown as a text label alongside each group of units.

```js
.label("decade")
```

### `.columns(value)` / `.radius(value)`

Grid layout column count, and unit circle radius in pixels.

```js
.columns(10).radius(4)
```

### `.group(field, options?)`

Arranges units into a **grouped grid** — one cluster per unique value of
`field` (sets `guide.layout = "groupedGrid"`). Infers a `guide` scene.

```js
base.group("period")
base.group("period", { color: PERIOD_LUMINANCE_COLOR })
```

### `.timeline(field, options?)`

Arranges units along a horizontal **timeline axis** bound to a quantitative
field (sets `guide.layout = "timeline"`). Infers a `guide` scene.

```js
base.timeline("year")
base.timeline("year", { title: "Year" })
```

### `.dodge(field, options?)`

Like `.timeline()`, but units **collision-avoid** (dodge) along the axis
instead of overlapping (sets `guide.layout = "dodge"`). Infers a `guide`
scene.

```js
base.dodge("year")
```

> `.timeline()`/`.dodge()`/`.group()` are mutually exclusive *layouts* — each
> call replaces the unit chart's guide layout with its own.

### Unit state family

```js
const base = unit("weather").x("year").y("hot_days").key("decade")
  .value("hot_days").label("decade");

const states = [
  base,
  base.where({ period: "recent" }),
  base.group("period"),
  base.timeline("year"),
  base.dodge("year")
];
```

> **Note:** unit charts don't implement `observation`/`granularity` scenes —
> their narrative range is `focus` (filtering the underlying rows) and `guide`
> (rearranging how units are laid out).

---

## Choosing an idiom

| If you want to show… | Reach for |
|---|---|
| Comparisons across categories | `bar` |
| Trends over an ordered axis (time, sequence) | `line` |
| Relationships between two quantities | `point` |
| Concrete counts as countable objects ("32 of these") | `unit` |

All four share the same authoring vocabulary (`.x`, `.y`, `.color`, `.key`,
`.where`, `.highlight`, `.guide`, …), so switching idioms mid-story — or
prototyping the same data three different ways — is mostly a matter of
swapping the factory call and adjusting idiom-specific methods.
