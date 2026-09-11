# Unit transition lab

These thirteen editable scenarios define the first complete transition matrix
for VisDelta's Unit module.

A Unit chart treats quantity as **countable, equal marks**. With raw observation
data, each row is one unit. With `.value("count")`, each row creates that many
units. A unit keeps the same size and identity across states; position, layout,
and color explain how the units are organised.

The public grammar separates meaning from arrangement:

- `.group("team")` declares which categorical group owns each unit;
- `.layout("bar")` arranges those groups as unit bars;
- `.layout("grid")` makes one overall grid;
- `.x("year").layout("timeline")` stacks units at mapped positions;
- `.x("year").layout("dodge")` places units around mapped positions without
  overlaps.

That separation is deliberate. `.group()` never silently changes layout or
color. Add `.color("team")` only when color should also carry the category.

```js
const byTeam = unit(rows)
  .value("count")
  .key("id")
  .group("team")
  .layout("bar", { columns: 3 })
  .color("team");
```

Unit does not have `.rollup()` or `.breakdown()`. It never replaces many units
with one summary mark, so there is no split/merge mechanic. Count changes use
ordinary unit Enter/Stay/Exit: surviving unit keys move, added units grow from
radius zero, and removed units shrink to radius zero.

Layout changes follow one reversible path: **Set view → move units**. Matching
always keeps the same key first, however far that unit needs to travel. Only
source and target units that cannot be paired by key are matched to open slots
using the shortest total travel. Short trips start before long trips to reduce
visual overlap. The opposite transition evaluates these exact frames backward:
units move first, then the old view returns.

<SyntaxPlayground mode="unit-lab" initial="bar" />

Every example imports only `visdelta/unit` and the generic transition entry.
The Unit builder, compiler, layouts, key-first matching, renderer,
identity, and transition rules
remain inside `src/charts/unit/`; Core does not know any Unit layout name.
