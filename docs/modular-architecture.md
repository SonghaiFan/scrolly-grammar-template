# Modules and bundle size

VisDelta has two layers that can exist independently:

```text
Core:        state -> difference -> transition -> frame
Chart module: builder + compiler + drawing + chart-specific change rules
```

The core does not import `bar`, `point`, `line`, or `unit`. A chart state carries
a small reference to its own chart module, and `transition()` loads that module
only when it is needed.

## Public entries

| Entry | What it provides |
| --- | --- |
| `visdelta` | All chart builders, differences, transitions, and plugin registration |
| `visdelta/core` | Chart-state normalization and `delta()` without drawing anything |
| `visdelta/bar` | The bar-chart builder |
| `visdelta/point` | The point-chart builder |
| `visdelta/line` | The line-chart builder |
| `visdelta/transition` | `transition()`, progress, play, pause, resize, and destroy |
| `visdelta/plugins` | Build a chart module or register one for plain specs |
| `visdelta/browser` | The same API using dependencies supplied by the browser |
| `visdelta/composition` | Advanced adapters for applications that provide their own controls |

Most users need only the chart type they are using, the transition entry, D3,
and the stylesheet:

```js
import * as d3 from "d3";
import { point } from "visdelta/point";
import { transition } from "visdelta/transition";
import "visdelta/style.css";
```

Importing `point` is enough. The state returned by `point()` tells the generic
transition runtime how to load Point. No root import and no global registration
are required.

## Dependency direction

```text
Application control
       ↓ progress 0…1
visdelta/transition  (knows no concrete chart names)
       ↑ chart-module reference
bar / point / another independently imported chart
```

The chart states do not depend on the control. A button, slider, timer, scroll
position, gesture, or route can drive the same transition.

## Size checks

`npm run bundle:check` measures five useful bundles:

- core difference calculation;
- bar authoring;
- point authoring;
- line authoring;
- bar plus transition, including required shared and the selected lazy-loaded
  bar code.

D3, optional Arquero, and CSS are measured separately. Arquero is needed only
when a chart uses a data transform.

## Current boundaries

- The two endpoint states must use the same chart type.
- Bar and point have cached frame data; line, unit, and custom chart types
  currently rebuild a frame when progress changes.
- `visdelta/composition` is an advanced integration entry, not the beginner API.
- A chart package owns its builder. VisDelta does not invent chain methods from
  a renderer configuration.
- A chainable chart state can carry its module. A plain JSON spec cannot, so its
  chart module must be registered explicitly before `transition()`.
- The complete `visdelta` entry is a convenience collection of the official
  charts. Focused entries keep chart types independent.
