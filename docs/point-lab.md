# Point transition lab

These twelve scenarios are the executable transition matrix for VisDelta's
point chart. They cover position, membership, emphasis, color, size, data,
axis, and summary/detail changes.

Edit either chart state, run the code, scrub any frame, reverse playback, and
inspect the computed difference. The same point is matched by `.key()` instead
of its array position.

<SyntaxPlayground mode="point-lab" initial="x" />

The lab tests transitions between point-chart states only. Every example uses
the real package from this checkout; it is not a separate demo renderer.
