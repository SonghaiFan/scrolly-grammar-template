# Layouts, Themes & Scrolling

This page covers everything that shapes how a story *looks and feels* on the
page, independent of its data and charts: the layout preset (where the chart
sits relative to the text), theming (colors via CSS custom properties), and
the scroll driver (how scrolling maps to step transitions).

All of this lives under `spec.layout` and `spec.theme`, set through the story
builder's `.layout(...)` or written directly into a hand-authored spec.

## Layout presets

The extracted scrollytelling package ships two layout presets, each applying a CSS class that controls
how the sticky chart figure and the scrolling narrative text are arranged:

| Preset | Arrangement | CSS class |
|---|---|---|
| `"floatToText"` (default) | Two columns: chart floats/sticks beside the text; the reader scrolls the narrative past it | `.sl-layout-preset-float-to-text` |
| `"textOverVis"` | Chart fills a sticky central stage; narrative text scrolls as a translucent overlay across it | `.sl-layout-preset-text-over-vis` |

```js
story().layout("floatToText")
story().layout("textOverVis")
```

Set the preset via `.layout(name)`, `.layout(name, { offset, nav, ... })`, or a
raw config object. Options passed with the preset are merged directly into
`spec.layout`; there is no `layout.runtime` wrapper. See
[Story Builder: `.layout()`](./story-builder.md#layoutpresetorconfig-options).
Custom layout registration is currently internal and is not a public package API.

## `layout` config reference

These fields all live alongside `preset` in `spec.layout`:

```js
{
  layout: {
    preset: "floatToText",
    offset: 0.58,        // Where in the viewport a step "activates" (see below)
    nav: true,           // Show the step-dot navigation rail
    progress: true,      // Show the top progress bar
    scroll: { /* … see below … */ }
  }
}
```

| Field | Type | Effect |
|---|---|---|
| `preset` | `"floatToText" \| "textOverVis"` | Visual arrangement (see above) |
| `offset` | `number \| string` | Viewport activation line for scroll-driven steps — see [Understanding `offset`](#understanding-offset) |
| `nav` | `boolean` | Render the clickable step-dot navigation rail |
| `progress` | `boolean` | Render the top progress bar that fills as you advance through steps |
| `scroll` | object | Scroll-driver configuration — see below |

## Understanding `offset`

`offset` defines the horizontal "activation line" in the viewport: the point
at which a step becomes active as it scrolls past. It accepts:

- A **fraction** `0 ≤ offset ≤ 1` — a proportion of the viewport height.
  `0.58` means "a step activates when its top crosses 58% down the viewport".
  This is the most portable form (adapts to any screen size).
- A **pixel number** `> 1` — an absolute distance from the top of the
  viewport.
- A **string** `"120px"` or `"55%"` — explicit unit forms, parsed the same
  way.

The default is `0.55`. Most stories look best with the offset somewhere in
the `0.5`–`0.65` range — high enough that the reader has "arrived" at the
step, low enough that the transition doesn't feel delayed.

## `scroll` config reference

```js
{
  scroll: {
    progress: "geometry",      // measurement strategy (currently the only supported mode)
    navigation: {
      behavior: "instant",     // "instant" | "smooth" — how clicking a nav dot scrolls
      progress: 0.98           // 0–1: where in the target step to land when navigating to it
    }
  }
}
```

`progress: "geometry"` is the (current) measurement strategy: the driver
reads each step element's bounding box on every scroll/resize tick and
derives `(index, progress, direction)` purely from layout geometry — no
IntersectionObserver thresholds or manual breakpoints to tune.

Updates are event-driven and coalesced per frame. ResizeObserver also watches
document and step sizes; there is no continuous idle polling. Call the driver's
`refresh()` after position-only layout changes that its observers cannot detect.

`navigation` controls what happens when the reader **jumps** to a step (via
the nav rail or a restored URL hash):

| Field | Default | Effect |
|---|---|---|
| `behavior` | `"instant"` | Passed to `window.scrollTo({ behavior })` — `"instant"` or `"smooth"` |
| `progress` | `0.98` | Where within the target step to land (`0` = just entering, `1` = about to exit) — landing near the end (`0.98`) means the step's transition has essentially completed when you arrive |

> Internally the scroll-driver config schema also reserves `start`, `end`,
> `clamp`, and `snap` keys for future tuning of the geometry measurement and
> snap-to-step behavior. As of this version they're normalized into the
> config object but don't yet change runtime behavior — set `offset` and
> `navigation` for now.

## Step actions and scroll-driven transitions

Whether a step's transitions are **scrubbed by scroll position** or **played
in full on nav/programmatic jumps** depends on its `action` list — set via the story
builder's [`.action()`](./story-builder.md#actionactions):

- `["step", "tooltip"]` (default): clicking a nav dot, sending a discrete
  `action({ type: "click" | "enter", step })` event, or scrolling into a step's activation line plays its
  transition **once, in full**.
- `["scroll", "tooltip"]`: the transition is **continuously interpolated**
  as the reader scrolls through the step — scrolling down plays it forward,
  scrolling up plays it backward, and partial scroll positions show partial
  transitions. Internally the scroll driver sends
  `action({ type: "progress", step, value, direction })` on every scroll tick,
  which maps `value ∈ [0, 1]` onto the
  step's D3 transition schedule via `easeProgress`.

Per-view scroll easing can be tuned via `narrative.action.scroll.ease`:
`"linear"` (default), `"cubic"`, `"cubicInOut"`, or `"cubicOut"`.

```js
story()
  .action(["scroll", "tooltip"])
  .add("Intro", base)                          // first step always also gets "enter"
  .add("Reveal", base.where({ period: "recent" }))
```

Use `.action(["step", "tooltip"])` for the default discrete mode, `.action(["scroll", "tooltip"])`
for the default scroll-scrubbed mode, or pass `action` to a single `.add()`
when only one reveal should use a different mode:

```js
story()
  .action(["step", "tooltip"])
  .add("Intro", base)
  .add("Scroll-scrubbed reveal", base.where({ period: "recent" }), {
    action: ["scroll", "tooltip"]
  })
```

Only steps that actually carry a `transition.scene` benefit from `"scroll"`
mode (a step with no inferred change has nothing to scrub) — but it's safe to
set it on every step; steps without transitions simply render fully.

## Theming

Use `.theme()` to load a custom stylesheet and set CSS variables as part of
the story spec:

```js
story()
  .theme("./my-theme.css")
```

```js
story()
  .theme({
    href: "./my-theme.css",
    background: "#fafafa",   // → --sl-bg
    foreground: "#222",      // → --sl-fg
    accent: "rgb(28, 106, 228)",       // → --sl-accent
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
      surface: "#fff",       // → --sl-surface
      "--sl-step-gap": "42px"
    }
  })
```

At `createStory()` time, the scrollytelling runtime loads `theme.href` (or `theme.url`,
`theme.css`, `theme.stylesheet`, and each item in `theme.stylesheets`) before
rendering the story. If the stylesheet is already present on the page, it is
reused. Concurrent instances wait for the same load. An inserted stylesheet is
removed only when the last using instance is destroyed; application-owned links
are never removed. A failed load rejects initialization and releases its leases.

Inline theme variables are written to the instance's `target`, not `:root`.
Story colors and built-in chart helpers read from that target, including delayed
animation callbacks. Destruction restores previous inline values/priorities,
unless the application has changed them since initialization. Standalone pair
transitions also read CSS variables from their target; call `resize()` after
changing those tokens to rebuild cached frames.

External CSS is still document-wide: loading two stylesheets with conflicting
`:root` or unscoped rules does not create isolated themes. Use target-scoped CSS
or inline theme variables for differently themed instances. Explicit semantic
tokens such as `colorPrimary` also update their local renderer aliases; complex
component tokens can be overridden directly with `theme.variables`.

The variable aliases map directly onto the CSS custom properties consumed by
the packaged stylesheets:

| Theme key | CSS variable |
|---|---|
| `background` | `--sl-bg` |
| `foreground` | `--sl-fg` |
| `surface` | `--sl-surface` |
| `muted` | `--sl-muted` |
| `border` | `--sl-border` |
| `accent` | `--sl-accent` |
| `grid` | `--sl-grid` |
| `axis` | `--sl-axis` |
| `shadow` | `--sl-shadow` |
| `fontFamily` | `--sl-font-family` |

Use `theme.variables` for any other `--sl-*` custom property. Keys without a
leading `--` are normalized to `--sl-*`, so `{ stepGap: "42px" }` becomes
`--sl-step-gap`.

The default categorical palette (`--sl-series-1` through `--sl-series-10`) is
**Tableau 10** — a perceptually balanced, widely-adopted scheme. Set
`theme.series` (or `theme.palette`) to replace it without touching each chart
idiom individually:

```js
// Switch to D3 schemeCategory10
story().theme({
  series: [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
  ]
})
```

Any domain-specific colours (e.g. hot/cold in a temperature dataset) should be
set via the encoding `range` array on the individual chart idiom, not via the
theme system:

```js
bar("weather")
  .color({ field: "type", domain: ["Hot days", "Cold days"], range: ["#b05d3b", "#536a9e"] })
```

Axes, legends, figure titles, and SVG text inherit `--sl-font-family`, so
theme typography affects the D3-rendered chart as well as the story shell.

For the full color-encoding system — categorical hue selection, sequential
intensity scales, hue+luminance composition, and colorblind guidance — see
[Color in VisDelta](./color-guide.md).

### Building a custom theme

For deeper customization than the three variables cover, write your own CSS
that targets `--sl-*` custom properties and the `.sl-*` structural classes
(`.sl-layout-preset-float-to-text`, `.sl-progress`, `.sl-nav`, `.sl-figure`,
…), and load it instead of (or alongside) `themes/default.css`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/visdelta@0.2.0/dist/visdelta.css">
```

`visdelta.css` provides the structural layout rules every preset depends
on — always load it. `themes/default.css` (or your `.theme("./my-theme.css")`
replacement) supplies the color palette on top.

## Putting it together

```js
story()
  .layout("floatToText", { offset: 0.6, nav: true, progress: true,
    scroll: { navigation: { behavior: "smooth", progress: 0.95 } } })
  .data(/* … */)
  .view("main", { title: "Melbourne Weather", height: 540 })
  .action(["scroll", "tooltip"])
  .add(/* … */)
  .toSpec();
```

This combination — `floatToText`, a moderate `offset`, and `["scroll",
"tooltip"]` actions — is the most common "classic scrollytelling" feel: text
scrolls past a sticky chart that smoothly morphs as you read.
