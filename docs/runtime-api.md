# Transition runtime API

VisDelta's runtime owns one seekable transition between two states of the same chart type
visualization states.

## `transition(from, to, options)`

```ts
async function transition(
  from: Visualization,
  to: Visualization,
  options: TransitionOptions
): Promise<VisualizationTransition>
```

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { transition } from "visdelta/transition";

const first = bar(rows).x("category").y("revenue").key("category");
const second = first.y("profit");

const change = await transition(first, second, {
  target: "#chart",
  d3,
  height: 420
});
```

### Options

| Field | Required | Meaning |
| --- | --- | --- |
| `target` | yes in practice | CSS selector or target element; defaults to `#app` |
| `d3` | yes | Renderer, scales, loading, and transition evaluation |
| `aq` | only with transforms | Current Arquero transform backend |
| `data` | for named data | Map of named data sources |
| `height` | no | Explicit chart height |
| `reconstruct` | no | Force reconstruction instead of a supported cached evaluator |

The endpoint chart types must match. Transitions between chart types are not supported.

## Controller

| Member | Meaning |
| --- | --- |
| `from`, `to` | Defensive endpoint snapshots |
| `delta` | Semantic difference between the endpoints |
| `view` | Mounted chart view element |
| `value` | Current normalized progress |
| `progress(value)` | Pause playback and synchronously show a frame from 0 through 1; movement direction is inferred from the previous value |
| `play(options?)` | Animate from the current or requested source progress to the destination |
| `pause()` | Stop owned playback without changing the current frame |
| `resize()` | Recompile at the current size while retaining progress |
| `destroy()` | Stop work, remove the owned surface, and release references |

`progress`, `play`, `pause`, and `resize` return the controller for chaining.
`destroy` is idempotent.

## Control independence

```js
slider.addEventListener("input", event => {
  change.progress(event.currentTarget.valueAsNumber);
});

button.addEventListener("click", () => {
  change.play({ from: change.value, to: 1 });
});
```

The control may be UI state, a gesture, a route, a timer, or scroll position.
VisDelta only needs a progress value from `0` to `1`.

Progress is directional. Moving from `0.7` to `0.8` is a forward frame, while
moving from `0.9` to `0.8` is a reverse frame. Most transitions look identical
in both directions. A chart may use the direction for a meaningful motion rule,
such as Unit marks bouncing when they fall but settling directly when they rise.
Repeating the same value and resizing keep the last movement direction.

## Lifecycle and errors

- Mounting owns the target contents; failed initialization restores the
  original nodes.
- Pass D3 explicitly when using ESM.
- Pass Arquero only when a declared transform currently needs it.
- Call `destroy()` when a framework component unmounts.
- Call `resize()` after a size or theme change that your application owns.

Common errors are intentional:

```text
transition() requires two states of the same chart type.
Pass { target, d3 } to transition().
transition(): missing dataset "name".
VisDelta target not found: selector
```
