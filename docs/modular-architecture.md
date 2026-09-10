# Modules and bundle size

VisDelta is split into small entry points so an application can load only what
it uses.

## Public entries

| Entry | What it provides |
| --- | --- |
| `visdelta` | All chart builders, differences, transitions, and plugin registration |
| `visdelta/core` | Chart-state normalization and `delta()` without drawing anything |
| `visdelta/bar` | The bar-chart builder |
| `visdelta/point` | The point-chart builder |
| `visdelta/transition` | `transition()`, progress, play, pause, resize, and destroy |
| `visdelta/plugins` | Define and register another chart type |
| `visdelta/browser` | The same API using dependencies supplied by the browser |
| `visdelta/composition` | Advanced adapters for applications that provide their own controls |

Most users need only the chart type they are using, the transition entry, D3,
and the stylesheet:

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { point } from "visdelta/point";
import { transition } from "visdelta/transition";
import "visdelta/style.css";
```

## Dependency direction

```text
Application control
       ↓ progress 0…1
visdelta/transition
       ↓
chart type + core difference
```

The chart states do not depend on the control. A button, slider, timer, scroll
position, gesture, or route can drive the same transition.

## Size checks

`npm run bundle:check` measures three useful bundles:

- core difference calculation;
- bar authoring;
- point authoring;
- bar plus transition, including required shared and lazy-loaded code.

D3, optional Arquero, and CSS are measured separately. Arquero is needed only
when a chart uses a data transform.

## Current boundaries

- The two endpoint states must use the same chart type.
- Bar and point have cached frame data; line, unit, and custom chart types
  currently rebuild a frame when progress changes.
- `visdelta/composition` is an advanced integration entry, not the beginner API.
- Adding a plugin registers drawing and transition behavior; it does not
  automatically create a new chainable builder function.
