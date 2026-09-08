# Transition scenes and endpoint semantics

ScrollyLite describes visualization states and evaluates changes between them.
A **delta** records differences between endpoints; a **transition scene** is an
internal planning classification used by idiom compilers and renderers to choose
animation behavior. It is not a second authoring grammar. A scene is not a Story
step, nor a serialized animation plan.

## Endpoint-only inference

Both Story compilation and standalone transitions classify the two endpoint
specs. Builder operation history and private capability metadata are not inputs.
A builder, its `toSpec()` result, and an equivalent independently constructed
builder produce the same inferred scenes. Repeating an operation that leaves
the endpoint unchanged produces no extra scene.

The ordered classifications are:

| Scene | Endpoint change |
| --- | --- |
| `focus` | Row-filter predicates or focus state changed |
| `observation` | An x/y field changed, except a pure axis swap or a grouping change that generates aggregate fields |
| `granularity` | Granularity state, aggregate/bin transforms, or bar segmentation changed; layout-only changes are excluded |
| `guide` | Axis swap, scale/domain/sort settings, guide state, or grouping layout alone changed |

Several can coexist, in the stable order `focus, observation, granularity,
guide`. The idiom's declared scene support filters this list during rendering.
For example, unit currently supports focus and guide only. A classification
does not imply every idiom implements the same visual effect.

```js
const first = bar(rows).x("country").y("sales");

const measure = first.y("profit");                  // observation
const selected = first.where({ country: "France" }); // focus
const both = selected.y("profit");                   // focus + observation
const flipped = first.flip();                       // guide
```

A bar `.where({ type: "Cold days" })` value selection remains focus; it does
not bind a different y field. This is distinct from `.y("profit")`, which is
observation. Older documentation conflated these two cases.

The first Story step has no predecessor and no inferred transition.
A delta can contain data, color, tooltip, key, or other differences without
a corresponding scene label; ordinary renderer updates still run. Scene names
are neither a complete taxonomy of the delta nor proof that every differing
property is animated.

## Current idiom behavior

- **Bar:** cached seekable transitions, keyed entry/exit, measure changes,
  filtering/highlighting, staged orientation changes, split/merge, and
  stacked/grouped layout changes.
- **Line:** keyed series updates, series split/merge, coordinate changes, and
  focus range-cropping. Its default `.where()` retains source rows and crops
  the x domain; it is not the same as physically filtering bar/point/unit rows.
- **Point:** coordinate changes and aggregate/detail gather/scatter behavior.
- **Unit:** filtering and grid/grouped/timeline/dodge layout transitions.

Only bar currently renders the documented selective highlight opacity behavior.
Line/point/unit can carry focus metadata, but selective highlight opacity is
not yet implemented in those renderers. Do not infer feature support solely
from an inherited authoring method.

Line, point, unit and unspecified custom plugins reconstruct a scene for each
seek. Bar caches interpolation tracks and phase/endpoint membership. See
[standalone transitions](./visualization-transitions.md) for timing, lifecycle,
and performance limits.

## Keys and staging

`.key()` identifies entities across endpoints. A stable semantic key lets a
mark move in place rather than exit and re-enter. Bar segmentation extends
identity to category/segment keys; measure-selector changes preserve entity
identity through the bar semantic-key rules.

Bar flip/split/merge can contain several internal phases. Pure layout changes
are guide changes, not changes in aggregation. Staging is renderer-specific:
a scene name describes what changed, not an instruction to run every idiom
through the same motion sequence.

Custom plugins declare their supported scenes, state-operation compilers and
optional intermediate phases. See [plugins](./extending-with-plugins.md).
