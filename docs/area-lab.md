# Area transition lab

These fourteen editable scenarios are the first executable transition matrix
for VisDelta's Area module. They cover mapping, keyed observations, values,
filtering, focus, highlight, fill, baseline, and reversible total/stacked
changes.

Area is a **band**, not a filled Line. Every x position has a lower boundary
`y0` and an upper boundary `y1`:

- ordinary Area uses `.baseline(0)` for `y0` and the mapped `.y()` value for
  `y1`;
- Stacked Area computes both boundaries from the cumulative values of each
  `.breakdown()` part;
- positive and negative values accumulate on opposite sides of the baseline.

On an ordinal x axis, Area exists **between connected observations**. Each
observation owns half of the space to its previous neighbour and half of the
space to its next neighbour. The first observation in a connected stretch owns
only its right half; the last owns only its left half. A stretch with only one
observation draws no Area: one point has no connection, so it cannot enclose a
filled band. Use Point when an isolated observation itself should stay visible.

Color is explicit. `.breakdown("region")` creates stack geometry but does not
silently assign hues. Pass a color range to `.breakdown()`, or chain
`.color("region")`. Without a color mapping, every area is black and the thin
boundary stroke keeps adjacent layers visible.

Split and merge are one transition evaluated in opposite directions. The
single total stays behind the entering stacked layers. First, a one-pixel
contrast divider is drawn along each internal cumulative boundary. It uses the
same `mix-blend-mode: difference` rule as stacked Bar, so it reads against the
area beneath it without choosing a fixed light or dark color. The layer edges
and fills then appear over the total. Merge reuses those cached frames backward:
the colors disappear and the divider erases itself. There is no separate merge
effect.

Observation membership also has one rule. Restore and Add place each new keyed
observation at its target x with zero thickness (`y1 = y0`), then grow it to its
authored value. This works in the middle and at either endpoint. Filter and
Remove show those same frames backward: the x position stays fixed while the
value flattens into the baseline. The polygon stays ordered and never tears into
crossed triangles.

Like Line, Area defaults to `.connect("adjacent")`. Filtering observations out
of the middle leaves separate connected stretches at their original x
positions. Use `.connect("across")` only when joining the surviving observations
is the intended statement.

Area uses the same plain `.curve("curveName")` grammar as Line. The name is an
exact D3 export such as `curveLinear`, `curveMonotoneX`, `curveNatural`, or
`curveStep`; VisDelta does not rename it. D3's `curveBundle` is the one Line-only
exception because it does not implement the Area curve interface. When the
curve changes, VisDelta matches points along the rendered SVG paths so the
boundary does not switch shape abruptly at progress zero.

<SyntaxPlayground mode="area-lab" initial="split" />

Every example imports only the focused Area module and the generic transition
entry. The Area builder, compiler, stack geometry, renderer, and transition
rules live together under `src/charts/area/`; Core contains no Area branch.
