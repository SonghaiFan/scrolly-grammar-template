# Developer guide

VisDelta describes chart states, finds their difference, draws the chart, and
controls the transition between two states.

## Install

```sh
npm install visdelta@0.2.0 d3
```

This package name/version is the current release candidate and is not yet a
claim that the package has been published.

Add `arquero@8` when using the current transform backend.

## Integration

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { transition } from "visdelta/transition";
import "visdelta/style.css";

const first = bar(rows).x("category").y("revenue").key("category");
const second = first.y("profit");
const change = await transition(first, second, { target: "#chart", d3 });

change.progress(0.5);
change.play({ duration: 700 });

// Framework teardown
change.destroy();
```

## Source architecture

```text
src/
  charts/             chart authoring, compilation, rendering, and transition plans
  data/               validation and transform execution
  grammar/            immutable view state, diff, and transition inference
  identity/           semantic object identity
  runtime/            chart surface, scene rendering, and progress evaluation
  transitions/        scene and intermediate-state compilation
  composition.ts      explicit adapter surface for external control packages
```

## Commands

```sh
npm test
npm run test:browser
npm run pack:check
```

The focused bundle gate rejects unrelated chart types and the advanced adapter
from the bar-plus-transition closure. See [Module
boundaries](./modular-architecture.md), [Visualization transitions](./visualization-transitions.md),
and [Plugins](./extending-with-plugins.md).
