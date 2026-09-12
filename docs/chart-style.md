# Chart style

VisDelta uses one small presentation vocabulary across its built-in charts, but
each chart module decides how that vocabulary applies to its own marks. The
runtime stays chart-agnostic and visual encodings remain explicit in the chart
state.

<ChartStyleGallery />

The live reference applies one preset to all five built-in chart types at once,
so mark, axis, label, grid, legend, and spacing decisions can be compared as one
system rather than inferred from a single example.

## Source of truth

Three layers have distinct jobs:

1. `src/styles.css` defines semantic CSS tokens for color, type, non-data ink,
   mark weight, legends, and figure chrome.
2. A chart-style module defines shared spacing, margins, grid policy, domain
   lines, and title placement. It does not contain data or transition meaning.
3. `src/charts/<type>/` owns chart-specific axes, grids, margins, marks, and
   transitions.

Theme files override semantic tokens. They do not repeat axis, grid, or legend
selectors from the base stylesheet.

## Switch the structural style

Pass a style module to the runtime; it is shared by both transition endpoints.
Omitted rules inherit the default D3-inspired module.

Three presets ship with the main stylesheet:

- `d3ChartStyle` is the quiet default, using familiar categorical colors and
  small rounded corners.
- `paperChartStyle` uses visible Cartesian axes, conventional centered/rotated
  axis titles, and a dedicated legend column on the right.
- `darkChartStyle` uses compact spacing, scoped high-contrast CSS, and a
  monochrome blueprint-blue series scale.

They are also available as `chartStylePresets.d3`, `.paper`, and `.dark`. Import
`visdelta/style.css` once; the runtime applies the matching `.sl-style-*` class
to its own root, so different presets can coexist on one page.

```js
import { transition } from "visdelta";
import { defineChartStyle } from "visdelta/chart-style";

const compact = defineChartStyle({
  key: "compact",
  tickSpacing: { x: 56, y: 44 },
  edgeTitleInset: { top: 12, right: 0, bottom: 4, left: 0 },
  legendInset: { top: 8, left: 8 },
  legendPosition: "right",
  charts: {
    bar: {
      margin: { top: 28, right: 12, bottom: 36, left: 40 },
      grid: "horizontal",
      openYDomain: false,
      edgeTitles: false
    }
  },
  axisTitle: channel => channel?.title
});

const change = await transition(from, to, {
  target: "#chart",
  d3,
  chartStyle: compact
});
```

The host receives `data-chart-style="compact"` and `.sl-style-compact`, so a
style package can pair structural rules with scoped CSS tokens. Style modules
do not enter visualization specs or semantic deltas.

## Default chart grammar

| Chart | Axes and grid | Marks | Default margins |
| --- | --- | --- | --- |
| Bar | Categorical baseline, open quantitative axis, no grid | Slightly rounded bars with tight band padding | Stable header room; horizontal bars reserve more category-label space |
| Point | Open x and y axes with a light two-direction grid | Outlined circles; ordinary enters grow at their target | Extra top room for legend and upward y title |
| Line | Baseline x-axis, open y-axis, light horizontal grid | Thin line with small observation points | Compact Cartesian margins |
| Area | Line-like axes and horizontal grid | Borderless filled band; transient divider only during detail transitions | Compact Cartesian margins |
| Unit | No axes for a plain grid; x-axis only for bar and beeswarm layouts | Equal circles with a light surface stroke | Small, stable margins |

These differences follow the reading task. A grid helps estimate Point
coordinates and compare a changing Line or Area against a scale. It adds noise
to a Bar chart whose lengths already meet a common baseline.

## Encodings and presentation defaults

With no color channel, marks use the theme accent as one constant presentation
color and no legend is drawn. VisDelta never assigns different colors to
categories unless the author declares `.color(...)` or an equivalent channel.
The same rule applies to size and position.

Axis titles use one SVG text node. Positional titles align to the plot-frame
edges: the legend occupies the first header row, then the upward title sits
close to the y-axis without touching its first tick. The horizontal title is
right-aligned at the bottom. Titles use arrows only to clarify direction. A coordinate dimension entering or
exiting may move from its chart edge. An incompatible axis type replaces its
geometry by crossfading on the current baseline; the title is never cloned.

The Paper preset deliberately uses a different composition: the x title is
centered below the plot, the y title is rotated along the left side, and the
legend is stacked in a reserved right column. Its left and bottom domain lines
remain visible, giving the plot a conventional Cartesian frame. Because these
are style-module rules, axes, marks, the plot clip, and legend all switch as one
coherent layout.

## Responsive behavior

Quantitative axes request roughly one tick per 80 horizontal pixels and one per
56 vertical pixels. Categorical labels thin only when their available band is
too small. Top legends wrap inside the stable header margin; right legends
stack inside a reserved side column. Adding a color encoding therefore cannot
move the plot during a transition. Margins are fitted before they can make the
plot negative, and SVGs use a view box with
`max-width: 100%` and automatic height.

Each transition resolves one invariant margin from both endpoints. The frame,
plot clip, axes, and marks therefore share the same plot bounds at every
progress value—even when an authored margin, orientation, legend, or style
differs between standalone states.

The visual reference is the restrained axis treatment used in the
[D3 horizontal bar chart](https://observablehq.com/@d3/horizontal-bar-chart/2):
small sans-serif labels, open quantitative axes, outer ticks removed, compact
margins, and data marks that remain visually dominant.
