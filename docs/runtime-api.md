# Transition runtime API

VisDelta's runtime owns one seekable transition between two same-idiom
visualization states. It does not own narrative layout or scrolling.

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

The endpoint chart idioms must match. Cross-idiom morphing is not supported.

## Controller

| Member | Meaning |
| --- | --- |
| `from`, `to` | Defensive endpoint snapshots |
| `delta` | Semantic difference between the endpoints |
| `view` | Mounted chart view element |
| `value` | Current normalized progress |
| `progress(value)` | Pause playback and synchronously show a frame from 0 through 1 |
| `play(options?)` | Animate from the current or requested source progress to the destination |
| `pause()` | Stop owned playback without changing the current frame |
| `resize()` | Recompile at the current size while retaining progress |
| `destroy()` | Stop work, remove the owned surface, and release references |

`progress`, `play`, `pause`, and `resize` return the controller for chaining.
`destroy` is idempotent.

## Driver independence

```js
slider.addEventListener("input", event => {
  change.progress(event.currentTarget.valueAsNumber);
});

button.addEventListener("click", () => {
  change.play({ from: change.value, to: 1 });
});
```

The driver may be UI state, a gesture, a route, a timer, or scroll geometry.
VisDelta only consumes progress; the extracted `scrollytelling/` package
currently owns the Story shell and native scroll adapter.

## Lifecycle and errors

- Mounting owns the target contents; failed initialization restores the
  original nodes.
- Pass D3 explicitly when using ESM.
- Pass Arquero only when a declared transform currently needs it.
- Call `destroy()` when a framework component unmounts.
- Call `resize()` after a size or theme change that your application owns.

Common errors are intentional:

```text
transition() requires two visualizations of the same chart idiom.
Pass { target, d3 } to transition().
transition(): missing dataset "name".
VisDelta target not found: selector
```
