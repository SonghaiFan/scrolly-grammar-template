# VisDelta

Describe how one chart looks before and after a change. VisDelta finds the
difference, then lets you play the movement or show any exact frame from
progress `0` to `1`. This state-first approach is what “declarative” means here.

Scrolling is not part of the core runtime. It is one possible external control.

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { transition } from "visdelta/transition";
import "visdelta/style.css";

const revenue = bar(rows)
  .x("category")
  .y("revenue")
  .key("category");

const profit = revenue.y("profit");
const change = await transition(revenue, profit, {
  target: "#chart",
  d3
});

change.progress(0.42);
change.play({ duration: 800 });
```

## What VisDelta includes

VisDelta owns:

- chart states that never change the state they were created from
- a meaningful difference between the first and last state
- chart-type compilation and rendering
- transitions that can show any progress value from `0` to `1`
- transform execution and plugin contracts

## Install

```sh
npm install visdelta@0.2.0 d3
```

`0.2.0` is a release candidate in this checkout and is not yet published under
the new npm name. Use the repository build until the VisDelta package is
released.

Arquero remains a conditional dependency for the current transform backend:

```sh
npm install arquero@8
```

It is needed when states use transforms such as `.where()`, `.sort()`,
`.breakdown()`, or `.rollup()`. Plain already-shaped data and transitions do
not require it.

## Public entries

| Entry | Responsibility |
| --- | --- |
| `visdelta` | Visualization grammar, delta, transition, and plugin registration |
| `visdelta/core` | DOM-free normalization and semantic delta |
| `visdelta/bar` | Focused immutable bar authoring |
| `visdelta/transition` | Pair initialization, seek, play, pause, resize, and destroy |
| `visdelta/plugins` | Plugin definition and registration |
| `visdelta/browser` | Browser-global dependency adapter |
| `visdelta/composition` | Low-level adapter contract for control packages |

`visdelta/composition` is for integration packages, not ordinary chart
authoring.

## Development

```sh
npm install
npm test
npm run test:browser
```

Build and serve the canonical documentation and editable bar transition lab:

```sh
npm run docs:build
python3 -m http.server 5511
```

Then open `http://127.0.0.1:5511/docs/.vitepress/dist/`.

Documentation starts at [docs/index.md](docs/index.md), with the complete
interactive API map in [docs/reference.md](docs/reference.md) and the current
ownership boundary in [docs/modular-architecture.md](docs/modular-architecture.md).

## Current limits

- Endpoint chart types must match; bar-to-line transitions are not supported.
- Bar has the richest semantic transition coverage.
- Arquero still executes authored transforms.

Released under the MIT License.
