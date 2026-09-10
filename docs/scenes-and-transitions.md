# How VisDelta understands chart changes

VisDelta compares two chart states and works out what changed. It uses that
answer to choose a transition. The author does not write a second animation
specification.

## It compares the two states, not the method history

Only the two finished states matter. A builder, its `.toSpec()` result, and an
equivalent independently-created state produce the same transition. Repeating a
method that leaves the endpoint unchanged does not add an animation step.

Internally, the current planner uses four labels:

| Internal label | Plain-English meaning |
| --- | --- |
| `selection` | Rows were filtered or some items were highlighted |
| `mapping` | A displayed field or mapping changed |
| `detail` | Totals were split into detail, or detail was combined into totals |
| `axis` | An axis, scale, orientation, sort order, or layout changed |

These are machine labels in the current difference result; they are not methods users
need to learn. The public grammar uses direct words such as `.where()`,
`.breakdown()`, `.rollup()`, `.flip()`, `.layout()`, and `.axis()`.

```js
const first = bar(rows).x("country").y("sales");

const newValue = first.y("profit");
const filtered = first.where({ country: "France" });
const both = filtered.y("profit");
const horizontal = first.flip();
```

Several kinds of change can happen together. A `Delta` can also report changes
to data, color, tooltips, keys, or other fields even when none of the four
internal labels fully describes them.

## Matching items with `.key()`

`.key()` tells VisDelta which item in the first state is the same item in the
second. A stable key lets a bar move, resize, or recolor in place. Without a
reliable match, an old item may need to exit and a new one enter.

```js
const first = bar(rows).x("country").y("sales").key("country");
const second = first.y("profit");
```

Segmented bars extend the match with their category and segment values. This is
why split and merge transitions can keep each piece continuous in both
directions.

## Ordered transition steps

Some changes need more than one step. A bar flip changes both coordinates, so
VisDelta changes one coordinate and then the other. Each coordinate step keeps
its scale, axis, and marks together:

```text
x step = x scale + x axis + marks
y step = y scale + y axis + marks
```

The default bar flip changes y, then x. Change the order on the operation itself:

```js
const horizontal = first.flip({ order: ["x", "y"] });
```

If the old and new axes use incompatible scale kinds, VisDelta fades between
them inside the same coordinate step. It does not abruptly swap the axis at the
first frame.

## Current behavior by chart type

- **Bar:** cached, seekable frames; matched enter/exit; value changes;
  filtering/highlighting; flip; split/merge; and stacked/grouped layouts.
- **Line:** series updates, series split/merge, coordinate changes, and range
  cropping. Its default `.where()` crops the x range instead of physically
  removing source rows.
- **Point:** coordinate changes and summary/detail gather-scatter behavior.
- **Unit:** filtering and grid, grouped, timeline, and dodge layouts.

Only bar currently draws selective highlight opacity. Line, point, and unit can
store highlight metadata, but do not yet render that effect.

Bar prepares reusable frame data when the transition starts. Line, point, unit,
and custom plugins currently rebuild a frame on each seek. See [Visualization
transitions](./visualization-transitions.md) for timing, lifecycle, and
performance limits.

Plugins declare which internal change labels they support and may provide extra
intermediate states. See [Plugins](./extending-with-plugins.md).
