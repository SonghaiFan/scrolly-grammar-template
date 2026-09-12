# Line transition lab

These sixteen scenarios are the executable transition matrix for VisDelta's
line chart. They cover x and y mappings, filtering, data changes, highlighting,
focus, color, line style, axis order, sliding time windows, and reversible
single-line/series changes.

Every scenario uses the same tidy stock dataset. Each row is one trading day
for one company, with explicit `date`, `ticker`, `open`, `high`, `low`, `close`,
and `volume` fields. The lab selects short AAPL and GOOG windows so individual
observations and intermediate frames remain readable. The source files were
reshaped before being added to the demo; VisDelta receives tidy rows and does
not clean or reshape them at runtime.

Edit either state, run the code, scrub any frame, or play it in both directions.
Observations are matched by `.key()`. Adding and restoring observations use one
shared transition: the axis, existing points, and line reach the new geometry
first; each new point then appears. Removing and filtering evaluate those exact
frames backward, so the point disappears before its line retracts.

Split and merge also use one shared transition evaluated in opposite
directions. Here the single line is the equal-weight mean of the AAPL and GOOG
closing prices, not a meaningless sum of stock prices. Split first cuts that
average into colored line pieces, moves those pieces to each company, and then
connects each company line. Merge shows those same three steps backward.

The line-style example also tests path matching. Changing from `curveLinear` to
`curveStep` changes the structure of the SVG path; the preview matches points on
the two visible paths before moving them, so intermediate frames stay continuous
instead of pairing unrelated numbers from the two `d` strings.

The time-window example combines the same Add and Remove behavior. VisDelta
matches observations by `.key()`: the leaving point disappears before its line
retracts, shared observations move with the axis, the entering line reaches its
new position, and then the entering point appears. The same keyed observation
matcher handles both changes; there is no separate time-window transition.

Filter and focus are deliberately separate. Filter removes observations; when
it removes observations from the middle, the default `connect("adjacent")`
keeps a gap. Focus keeps all observations and the full line, changes the x view,
and clips what falls outside it. Line and Area share the same connected-stretch
rule: a stretch needs at least two observations. An isolated Line observation
keeps its point mark but does not create a line path.

<SyntaxPlayground mode="line-lab" initial="x" />

Every example imports the focused Line module and the generic transition entry.
It does not load the complete chart collection.
