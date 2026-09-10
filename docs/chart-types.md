# Chart types

VisDelta includes four chart types: `bar`, `line`, `point`, and `unit`. Their
methods can be chained like a sentence. Call `.toSpec()` when you need the plain
JavaScript object behind a chart state.

```js
import { bar, line, point, unit } from "visdelta";

bar("dataset")     // → BarState
line("dataset")    // → LineState
point("dataset")   // → PointState
unit("dataset")    // → UnitState
```

All four extend the same `ChartState` base, so most data mapping, filtering,
and styling methods work identically across chart types.
This page documents the shared methods first, then each chart type's specific
methods, defaults, and example progressions.

> **Every change makes a new state.** The original stays untouched, so you can
> make several versions from one `base` chart and move between them safely.

---

## Shared methods (all chart types)

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

Default channel `type` differs per chart type (documented in each chart's section
below) — e.g. bar's `.x()` defaults to `"nominal"`, point's `.x()`/`.y()`
default to `"quantitative"`.

```js
bar("rows").x("decade")                                  // { field: "decade", title: "Decade", type: "nominal" }
bar("rows").x({ field: "decade", title: "By Decade" })   // explicit override
bar("rows").y("count", "Total count")                    // shorthand: string 2nd arg → { title }
```

<SyntaxPlayground initial="measure" compact />

### `.channel(name, field, options?)`

Sets a visual property by name. Use this lower-level method when a chart has no
direct method such as `.x()`, `.y()`, or `.color()` for that property.

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

Tells VisDelta how to **match the same item** between two chart states. Use the
field or fields that uniquely name the thing a reader is following. A single
field becomes a string; multiple fields stay an array:

```js
.key("decade")               // → key: "decade"
.key(["decade", "type"])     // → key: ["decade", "type"]
```

See [Concepts → Matching items](./concepts.md#matching-items-with-key) for
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

Internally this sets `state.selection = { mode: "highlight", filter: selector,
opacity? }` and infers a `selection` scene.

### `.axis(config)`

Low-level axis setter. It controls scales, axis settings, orientation, and the
order of x/y transition steps. Most of the time `.flip()` is simpler:

```js
.axis({ y: { scale: { type: "log" } } })
.axis({ flip: true, order: ["y", "x"], duration: 500 })
```

---

## Bar — `bar(dataset)`

A categorical bar chart. Defaults: `mark: "bar"`, `.x()` type `"nominal"`,
`.y()` type `"quantitative"`.

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");
```

### `.where(selector)` — richer on bar

Bar's `.where()` does more than filter rows — it also tries to keep the
chart readable as the selected category changes:

- **Accumulates constraints per field**: calling `.where({ period: "recent" })`
  after `.where({ type: "Hot days" })` keeps both constraints (each new
  selector replaces only the constraint on the *same* field).
- **Keeps bars matched** when filtering on a "measure-like" field
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
endpoint delta and selection inference.

### `.flip(options?)`

Swaps the bars from vertical to horizontal. By default it changes y first, then
x. Each step keeps the scale, axis, and marks together so they never disagree.

```js
.flip()
.flip({ domain: ["Cold days", "Hot days"] })               // pin the flipped axis's domain
.flip({ order: ["x", "y"] })                              // change x first, then y
.flip({ duration: 600, stagger: { step: 30, max: 300 } })
```

`options`:
| Key | Effect |
|---|---|
| `domain` / `scale.domain` | Fixes the domain of the flipped scale |
| `scale` | Merges into the axis scale config |
| `order` | x/y step order, default `["y", "x"]` |
| `duration` / `stagger` | Timing for each step |

<SyntaxPlayground initial="flip" compact />

### `.breakdown(segment?, options?)`

Splits one total bar per category into **segments** using another field. This is
the direct one-total → stacked/grouped-detail operation.

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

The inverse of `.breakdown()`: combines multiple rows or segments into
**fewer total bars**.

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

Lower-level detail primitive behind `.breakdown()` — directly configures
a multi-field "long format" segmentation, including **wide-to-long folding**
(turning columns like `hot_days`/`cold_days` into rows). Most stories should prefer `.breakdown()`/`.rollup()`;
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

Switches between `"stacked"` and `"grouped"` segment layouts. It is only useful
after `.breakdown()` or `.segment()`. Set transition order and timing here when
the layout change needs more than one x/y step.

```js
base.breakdown("type").layout("grouped")
base.breakdown("type").layout("grouped", { duration: 500 })
```

### Transition order

There is no separate animation-language method. Put `order`, `duration`, and
`stagger` on the chart change that needs them. This keeps the code readable:

```js
base.flip({ order: ["x", "y"], duration: 700 })
base.breakdown("type").layout("grouped", {
  order: ["y", "x"],
  stagger: { step: 40 }
})
```

### Bar state family

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");

const states = {
  baseline: base.where({ type: "Hot days" }),
  selection: base.where({ type: "Hot days", period: "recent" }),
  flip: base.where({ type: "Hot days", period: "recent" }).flip(),
  split: base.breakdown("type"),
  highlight: base.breakdown("type").highlight({ type: "Cold days" }),
  grouped: base.breakdown("type").layout("grouped").flip(),
  rollup: base.rollup("decade", { title: "Average days", op: "mean" })
};

const pair = await transition(states.baseline, states.selection, { target, d3, aq });
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

Swaps x/y axes.

```js
.flip()
.flip({ x: { scale: { type: "log" } }, order: ["x", "y"] })
```

`options`: `x`/`y` (per-axis settings), `order` (default `["x", "y"]`),
`duration`, and `stagger`.

### `.breakdown(field, options?)`

Splits a single line into **multiple series** — one line per unique value of
`field`.

```js
base.breakdown("period")
base.breakdown("period", { color: ["#b05d3b", "#888", "#536a9e"] })   // explicit range
base.breakdown("period", { color: PERIOD_LUMINANCE_COLOR })            // composite color config
```

### `.rollup(groupbyOrOptions?, options?)`

The inverse: merges multiple series back into a **single line**.

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
  base.axis({ y: { scale: { type: "log" } } }),
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

Swaps x/y coordinates. It accepts the same `x`, `y`, `order`, `duration`, and
`stagger` options as line's `.flip()`.

### `.rollup(groupby, options?)`

Aggregates individual points into **larger summary circles** — e.g. one
circle per period instead of one per year.

```js
base.rollup("period")
base.rollup(["period", "region"], {
  countAs: "n",
  sizeRange: [6, 36],          // map aggregate count → circle radius range
  x: { op: "mean" },           // aggregation config for this chart type
  y: { op: "mean" }
})
```

`options`: `key` (how summary points are matched, defaults from `groupby`),
`x`/`y` (per-axis aggregation config), `countAs` (name for the synthesized
count field), `sizeRange` (`[min, max]` radius mapping for aggregate size).

### `.breakdown(detail?, options?)`

The inverse of `.rollup()` — reveals **finer-grained detail** within an
aggregated view (e.g. expand period-level circles into year-level points
while preserving the higher-level match).

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
`field`.

```js
base.group("period")
base.group("period", { color: PERIOD_LUMINANCE_COLOR })
```

### `.timeline(field, options?)`

Arranges units along a horizontal **timeline axis** bound to a quantitative
field.

```js
base.timeline("year")
base.timeline("year", { title: "Year" })
```

### `.dodge(field, options?)`

Like `.timeline()`, but units **collision-avoid** (dodge) along the axis
instead of overlapping.

```js
base.dodge("year")
```

> `.timeline()`/`.dodge()`/`.group()` are mutually exclusive *layouts* — each
> call replaces the unit chart's current layout.

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

> **Note:** unit charts currently animate filtering and layout changes. Value
> remapping and summary/detail transitions are still developing.

---

## Choosing a chart type

| If you want to show… | Reach for |
|---|---|
| Comparisons across categories | `bar` |
| Trends over an ordered axis (time, sequence) | `line` |
| Relationships between two quantities | `point` |
| Concrete counts as countable objects ("32 of these") | `unit` |

All four share the same authoring vocabulary (`.x`, `.y`, `.color`, `.key`,
`.where`, `.highlight`, `.axis`, …), so trying the same data with another chart
type is mostly a matter of
swapping the factory call and adjusting chart-specific methods.
