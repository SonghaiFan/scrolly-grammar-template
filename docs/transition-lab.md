# Bar transition lab

These thirteen scenarios are the executable transition matrix for VisDelta's
current bar implementation. Edit either endpoint, run the code, scrub any
frame, reverse playback, and inspect the computed semantic delta.

The lab uses the bundled [US population by state and age CSV](/data/us-population-state-age.csv)
instead of toy A/B/C rows. The source stays in its original wide form: one row
per region and nine numeric age columns. Segmented examples make the reshaping
explicit with `.segment({ fields: AGE_BANDS, as: ["age", "population"] })`,
then explicitly bind `.color("age", ...)` with the same ordered domain and a
nine-color palette. Folding the columns never creates a color encoding by
itself.

The stacked overview keeps all 52 regions. Transitions whose mechanics need
wider marks declare a fixed six- or eight-state subset directly in the editable
code, so the filtering is visible and every frame remains readable. The data
replacement example loads the same CSV with the provided `d3` object and adds
unchanged source rows; it does not manufacture replacement values.

<SyntaxPlayground mode="bar-lab" initial="measure" />

The lab is intentionally limited to transitions between bar-chart states. A successful
render demonstrates this pair, not an undocumented guarantee for every possible
combination of transforms and encodings.
