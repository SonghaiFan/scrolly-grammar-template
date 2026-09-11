# Visualization transitions

VisDelta's visualization builders are chainable declarations. Deriving a new
visualization preserves the previous one. Pass two states of the same chart type to
`transition()` to display, play, or seek their animated change.

This is the canonical 0.2 pair-transition API.
Until publication, build the checkout or install its local tarball to try it.

```js
import * as d3 from 'd3';
import { bar } from 'visdelta/bar';
import { transition } from 'visdelta/transition';
import 'visdelta/style.css';

const rows = [
  { country: 'Australia', sales: 80, profit: 30 },
  { country: 'France', sales: 60, profit: 40 },
  { country: 'Germany', sales: 100, profit: 25 }
];

const bar1 = bar().data(rows).x('country').y('sales').key('country');
const bar2 = bar1.y('profit');

const change = await transition(bar1, bar2, {
  target: '#chart', d3, height: 400
});

change.progress(0.37);  // immediately show this frame and pause playback
change.play({ duration: 800 }); // replay from 0 to 1
```

## Contract

- `bar1` and `bar2` are separate declarations. Constructing either does not draw
  or animate anything. Their method calls are not individual animation steps.
- `transition()` snapshots both declarations and resolves their data before
  creating the display. Matching source requests are loaded once per transition.
- A Delta describes what differs between the two states. The chart planner
  matches items, finds which ones enter or exit, and builds ordered steps.
- `key` tells VisDelta how to match the same item between states. Use a stable,
  unique key for the items represented at the current level of detail.
- Progress is a normalized position through the whole transition, including its
  steps and stagger. It is not necessarily a linear fraction of a mark's distance.
- `progress(0)` shows the source; `progress(1)` shows the target. Arbitrary orders
  such as `0.8 → 0.2 → 1 → 0.37` reconstruct the same frame as a direct `0.37`,
  for fixed data, container size, theme, and renderer configuration.
- Bar aggregate/detail pairs use one canonical parent-to-child path. For both
  stacked and grouped layouts, separately authored split and merge transitions
  are exact reverses: `split.progress(p)` displays the same frame as
  `merge.progress(1 - p)`. This includes cutlines, fills, opacity, staggering,
  legends, axes, and x/y steps. The controller still exposes `from`, `to`,
  and `delta` in the order the author declared.
- Non-finite progress is rejected; finite values outside `[0, 1]` are clamped.
- Different chart types are rejected. This API does not animate bar → line.

## Data

All built-in factories support `bar()` followed by `.data(...)`, as well as
`bar(source)`. Data binding declares a source; loading happens when the transition
is created. `.data(...)` replaces the complete previous source.

```js
bar().data(rows);                         // inline rows
bar().data({ values: rows });             // inline source object
bar().data('./weather.csv');              // URL, same as bar('./weather.csv')
bar().data({ url: './rows.json', type: 'json' });
bar().data('weather');                    // named source
```

For named sources, pass `data: { weather: { url: './weather.csv' } }` in the
transition options. Missing source names reject rather than rendering an empty
chart. A transition keeps its loaded data snapshot; construct another transition
to fetch updated data. Data transformations still use the existing chart grammar.
Arquero is optional for data with no transforms. Pass `aq` when a visualization
uses filters, aggregation, fold, bin, sort, or another data transform.
See [data transform grammar](./data-transforms.md) for supported operations and
validation errors; unsupported declarations are not silently ignored.

Channel methods retain their existing configuration-merge behavior in this
increment. For example, `.y('profit', { aggregate: 'mean' }).y('sales')` preserves
`aggregate: 'mean'`. The new pair API does not change those authoring semantics.

## Controller

| Member | Behavior |
| --- | --- |
| `progress(p)` | Synchronously display a frame; pause active playback |
| `play({ duration = 800, from = 0, to = 1 })` | Play using the same frame evaluator; duration is milliseconds for the full interval |
| `pause()` | Stop advancing, retaining the current frame |
| `value` | Current normalized progress |
| `resize()` | Recompile at the current size/theme and display the same progress |
| `destroy()` | Cancel playback, stop owned scene transitions, and remove owned markup; safe to repeat |
| `from`, `to` | Inspection copies of the compiled authored endpoint specs |
| `delta` | Resolved endpoint diff, including data and encoding-channel differences |
| `view` | The chart container element |

Control methods return the controller. `play()` is not a completion Promise.
To resume after pausing, use `change.play({ from: change.value })`; to reverse,
use `change.play({ from: 1, to: 0 })`. A partial interval takes the corresponding
fraction of duration. Duration zero immediately shows the requested endpoint.
Calls after `destroy()` reject, except another `destroy()`.

Use a dedicated empty target: successful initialization replaces its contents.
The controller does not install scroll or window resize listeners.

```js
button.onclick = () => change.play();
slider.oninput = () => change.progress(Number(slider.value));

// Your own scroll handler or observer can supply a normalized value too.
function onScrollProgress(p) { change.progress(p); }
```

## Implementation boundary

Built-in bar pairs compile once during initialization. Data transforms, layouts,
keyed joins, and D3 tween factories prepare reusable property changes and
endpoint/phase DOM snapshots. Later `progress()` calls evaluate those changes on retained SVG
nodes; they do not run the data pipeline, create scales, or schedule D3 transitions.
`play()` advances progress through exactly the same evaluator.

Each cached change contains a start time, duration, easing, and an interpolator.
Ordered steps initialize later interpolators from the correct preceding state. On a
backward seek, a property whose step has not started evaluates to its starting
value. Bar flips, split/merge and stacked/grouped routes also cache their
intermediate phases. Crossing a phase or endpoint restores which nodes are present,
attributes, bound data, and tooltips, without rerunning its renderer. This costs
more than a seek within the same phase, but does not allocate a fresh SVG tree.
Exit nodes detach at endpoints and can reattach on a reverse seek. Common keyed
marks retain their node identity. The cache retains nodes for each phase until
resize or destruction, trading initialization time and memory for cheaper seeks.

Call `resize()` after container size or theme changes. It invalidates the cached
frame data, recompiles against the already-loaded data, and shows the same progress.
It does not fetch data again. Create a new transition for different data or chart
configuration. Window resize listeners are not installed automatically. Do not
expect individual mark nodes or listeners to survive a recompile. The built-in
tooltip handlers are restored per phase; externally attached native listeners and
D3 handlers with a separate namespace survive ordinary seeks.

Line and custom renderers without an explicit cache capability use the
deterministic reconstruction bridge: each seek rebuilds their SVG scene and
repeats layout/transforms. The cached Area, Bar, Point, and Unit compiler extracts interpolation functions from D3 schedules
at initialization; it is not yet independent of D3 internals. The resulting frame
evaluator has no live D3 timers. Existing renderer limitations still apply. The
delta is diagnostic and is not a serialized animation or a guarantee that every
custom field animates.

## Local example and verification

Build the documentation and open the [Bar transition lab](./transition-lab.md)
or [Point transition lab](./point-lab.md). Each lab's twelve editable scenarios
run the built ESM package directly and form the public demonstration of its
browser transition matrix.

```sh
npm install
npm test
npx playwright install chromium
npm run test:browser
```

To use an installed Chrome instead, set `VISDELTA_CHROME_PATH` to its executable.
Browser checks cover random seek order, endpoint restoration, stationary frames,
time playback, pause, resizing, destruction, and same-type validation. Cache
checks also compare mark geometry against the original reconstruction path,
verify stable nodes and restored listeners, and instrument data/scale/schedule
creation to ensure seeks and playback do not repeat compilation.

For a repeatable bar microbenchmark (100, 500, 1000 marks), serve the checkout with
`node scripts/serve-tests.mjs`, then run `node scripts/benchmark-transition.mjs`.
An optional output filename saves the JSON measurements. The benchmark measures
initialization and synchronous seek/layout cost; it does not include raster or
compositing time and does not report end-to-end FPS.

See [Bar transition cache benchmark](./transition-performance.md) for the recorded
before/after measurements and their scope.
