# Line transition lab

These sixteen scenarios are the executable transition matrix for VisDelta's
line chart. They cover x and y mappings, filtering, data changes, highlighting,
focus, color, line style, axis order, sliding time windows, and reversible
single-line/series changes.

Edit either state, run the code, scrub any frame, or play it in both directions.
Observations are matched by `.key()`. Adding and restoring observations use one
shared transition: the axis, existing points, and line reach the new geometry
first; each new point then appears. Removing and filtering evaluate those exact
frames backward, so the point disappears before its line retracts.

Split and merge also use one shared transition
evaluated in opposite directions. Split first cuts the total into colored line
pieces, then moves those pieces to their series positions, and finally connects
each series. Merge shows those same three steps backward.

The line-style example also tests path matching. Changing from `curveLinear` to
`curveStep` changes the structure of the SVG path; the preview matches points on
the two visible paths before moving them, so intermediate frames stay continuous
instead of pairing unrelated numbers from the two `d` strings.

The time-window example demonstrates a different plan. VisDelta matches the
observations by `.key()`, moves the shared points left, and keeps the leaving and
entering edge points outside the clipped plot. The path therefore expresses a
window shift rather than pairing unrelated SVG path commands by array index.

Filter and focus are deliberately separate. Filter removes observations; when
it removes observations from the middle, the default `connect("adjacent")`
keeps a gap. Focus keeps all observations and the full line, changes the x view,
and clips what falls outside it.

<SyntaxPlayground mode="line-lab" initial="x" />

Every example imports the focused Line module and the generic transition entry.
It does not load the complete chart collection.
