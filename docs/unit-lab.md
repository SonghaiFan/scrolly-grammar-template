# Unit transition lab

These thirteen editable scenarios use the 150-observation Iris dataset to define
the first complete transition matrix for VisDelta's Unit module. Each flower is
one row and one unit. The added `flowerId` field gives every observation a stable
identity, including the two flowers whose measurements are otherwise identical.

A Unit chart treats quantity as **countable, equal marks**. With raw observation
data, each row is one unit. With `.value("count")`, each row creates that many
units. A unit keeps the same size and identity across states; position, layout,
and color explain how the units are organised.

The public grammar separates meaning from arrangement:

- `.group("team")` declares which categorical group owns each unit;
- `.layout("bar")` arranges those groups as unit bars;
- `.layout("grid")` makes one overall grid;
- `.x("year").layout("beeswarm")` places units around mapped positions without
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

The lab therefore does not call `.value()`: it does not turn a measurement into
a count. Sepal and petal measurements are used only when a scenario explicitly
maps one of them to position, and species is mapped to color only when `.color()`
appears in the example.

Unit does not have `.rollup()` or `.breakdown()`. It never replaces many units
with one summary mark, so there is no split/merge mechanic. Count changes use
ordinary unit Enter/Stay/Exit: surviving unit keys move, added units grow from
radius zero, and removed units shrink to radius zero.

`.focus()` uses the same Core camera as every other chart type. Unit contributes
only each circle's visual bounds; Core applies one 2D pan and zoom while all 150
unit identities remain present.

Layout changes follow one reversible path: **Set view → move units**. Matching
always keeps the same key first, however far that unit needs to travel. Only
source and target units that cannot be paired by key are matched to open slots
using the shortest total travel. Short trips start before long trips to reduce
visual overlap. The opposite transition preserves those keyed assignments and
reverses the phase order: units move first, then the old view returns.

Bar and beeswarm layouts make that path more specific: **Set view →
move across → fall**. Every existing unit first reaches its truthful x position
while keeping its old height. It then falls into the bar or non-overlapping
swarm.
Downward travel uses a short bounce; upward travel settles without pretending
that gravity points upward. Reverse playback preserves the same keyed route and
reverses the phase order, but chooses easing from the actual screen direction:
down can bounce; up never does.

Unit transitions use a light per-mark delay by default. Layout changes order
marks by travel distance, so short moves start first; other Unit changes use
data order with a 4 ms step capped at 100 ms. Write
`.transition({ stagger: 0 })` when every unit should move together, or provide
an explicit `stagger` object to replace the Unit default.

<SyntaxPlayground mode="unit-lab" initial="bar" />

Every example imports only `visdelta/unit` and the generic transition entry.
The Unit builder, compiler, layouts, key-first matching, renderer,
identity, and transition rules
remain inside `src/charts/unit/`; Core does not know any Unit layout name.
