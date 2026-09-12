# Core Concepts

VisDelta has four parts:

<div class="ontology-flow">
  <code>Chart state</code><span>to</span><code>Difference</code><span>to</span><code>Transition</code><span>to</span><code>Control</code>
</div>

The first three belong to VisDelta. A control is application code that supplies
time or normalized progress: a button, slider, scroll position, gesture, route,
or test.

## Chart state

A **chart state** is an immutable declaration produced by a chain such as:

```js
const revenue = bar(rows)
  .x("category")
  .y("revenue")
  .key("category");

const profit = revenue.y("profit");
```

`profit` derives from `revenue`; it does not mutate it. A declaration describes
an endpoint and does not mount a chart by itself. Calling `.toSpec()` compiles
the chain to a serializable visualization spec.

## Difference

`delta(from, to)` compares two states of the same chart type without touching
the DOM. It reports changes to data, mappings, keys, filters, axes, layout,
detail, and transition settings.

```js
import { delta } from "visdelta/core";

const change = delta(revenue, profit);
```

The delta is semantic input for evaluation and inspection. It is not a list of
SVG mutations that application code must execute.

## Transition

`transition(from, to, options)` loads and compiles both endpoints, mounts the
appropriate chart renderer, and returns a seekable controller.

```js
import * as d3 from "d3";
import { transition } from "visdelta/transition";

const pair = await transition(revenue, profit, {
  target: "#chart",
  d3
});

pair.progress(0.42);
pair.play({ duration: 800 });
pair.pause();
pair.resize();
pair.destroy();
```

Progress is always normalized from `0` to `1`. The controller owns evaluation;
the caller owns when and why progress changes.

## Control

A **control** converts an interaction or clock into progress. It deliberately
stays outside the transition:

```js
slider.addEventListener("input", event => {
  pair.progress(Number(event.currentTarget.value));
});
```

This boundary lets the same transition work for a click, a scrubber, scrolling,
automated playback, or a static frame export.

## Chart type

A **chart type** is a family such as `bar`, `line`, `point`, or `unit`. Each
chart type bundles a renderer, a spec compiler, the changes it supports, and an
optional transition planner. Both endpoints must currently use the same chart
type; bar-to-line transitions are not part of the public contract.

See [Chart types](./chart-types.md) and
[Extending with Plugins](./extending-with-plugins.md).

## Matching items with `.key()`

The key answers: “which mark at the first endpoint is the same object at the
second endpoint?”

```js
bar(rows).x("category").y("value").key("category")
```

Choose fields that remain stable through the change. Good matching lets marks
move, resize, split, or merge while retaining object permanence. Ambiguous or
unstable keys turn a meaningful transition into unrelated exits and enters.

## Kinds of chart change

VisDelta classifies endpoint differences into six semantic families:

| Family | Question | Typical authoring trigger |
| --- | --- | --- |
| Data membership | Which observations remain in the data? | `.where()` |
| Attention | Which existing marks receive emphasis? | `.highlight()` |
| View | Which part of the unchanged data is visible? | `.focus()` |
| Axis or layout | How is the same data arranged or read? | `.flip()`, `.axis()`, `.layout()` |
| Detail | Are we showing totals or their parts? | `.breakdown()`, `.rollup()`, `.segment()` |
| Value or mapping | Which field is shown through x, y, color, or size? | `.x()`, `.y()`, `.color()` |

These internal labels describe *what changed*. The chart's transition plan
decides which plain ordered steps show the change.

## Authoring declaration vs compiled spec

Builders retain authoring information used for defaults and inference.
`.toSpec()` compiles shorthand, transform declarations, keys, axes, and
chart-specific options into a plain object. This separates a fluent authoring
surface from the normalized evaluator input.
