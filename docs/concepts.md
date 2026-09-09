# Core Concepts

VisDelta has four layers:

<div class="ontology-flow">
  <code>Visualization</code><span>to</span><code>Delta</code><span>to</span><code>Transition</code><span>to</span><code>Driver</code>
</div>

The first three belong to VisDelta. A driver is application code that supplies
time or normalized progress: a button, slider, scroll position, gesture, route,
or test.

## Visualization

A **visualization** is an immutable declaration produced by a chain such as:

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

## Delta

`delta(from, to)` compares the meaning of two same-idiom endpoints without
touching the DOM. It reports changes to identity, data, encoding, focus, guide,
transform, granularity, and transition metadata.

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

## Driver

A **driver** converts an interaction or clock into progress. It is deliberately
outside VisDelta's core ontology:

```js
slider.addEventListener("input", event => {
  pair.progress(Number(event.currentTarget.value));
});
```

This boundary lets the same transition work for a click, a scrubber, scrolling,
automated playback, or a static frame export.

## Idiom

An **idiom** is a chart-type plugin. `bar`, `line`, `point`, and `unit` are
built in. An idiom bundles a renderer, a spec compiler, supported semantic
changes, and optional transition plans. A transition currently requires both
endpoints to use the same idiom; cross-idiom morphing is not part of the public
contract.

See [Chart Idioms](./chart-idioms.md) and
[Extending with Plugins](./extending-with-plugins.md).

## Semantic identity

The key answers: “which mark at the first endpoint is the same object at the
second endpoint?”

```js
bar(rows).x("category").y("value").key("category")
```

Choose fields that remain stable through the change. Good identity lets marks
move, resize, split, or merge while retaining object permanence. Ambiguous or
unstable keys turn a meaningful transition into unrelated exits and enters.

## Change taxonomy

VisDelta classifies endpoint differences into four semantic families:

| Family | Question | Typical authoring trigger |
| --- | --- | --- |
| `focus` | Which observations are visible or emphasized? | `.where()`, `.highlight()` |
| `guide` | How is the same data arranged or read? | `.flip()`, `.guide()`, `.layout()` |
| `granularity` | What aggregation or grouping level is shown? | `.breakdown()`, `.rollup()`, `.segment()` |
| `observation` | Which variable or channel is encoded? | `.x()`, `.y()`, `.color()` |

The taxonomy describes *what changed*. The idiom's transition plan decides
*how that change is staged*.

## Authoring declaration vs compiled spec

Builders retain authoring information used for defaults and inference.
`.toSpec()` compiles shorthand, transform declarations, keys, guides, and
idiom-specific options into a plain object. This separates a fluent authoring
surface from the normalized evaluator input.

## Where Story and Seq went

`story()`, `seq()`, layouts, navigation, and native scroll progress are
composition concepts, not visualization-transition primitives. They now live
in the repository's private `scrollytelling/` package for later integration
into ScrollyTale. They are not exported from `visdelta`.

See [Module Boundaries](./modular-architecture.md) for the ownership contract.
