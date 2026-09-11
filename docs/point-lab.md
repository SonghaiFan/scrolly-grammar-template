# Point transition lab

These thirteen scenarios are the executable transition matrix for VisDelta's
point chart. They cover position, membership, emphasis, color, size, data,
axis, focus, and summary/detail changes.

Edit either chart state, run the code, scrub any frame, reverse playback, and
inspect the computed difference. The same point is matched by `.key()` instead
of its array position.

The summary/detail examples also include an experimental **Clean / Blend**
control. Blend adds a temporary liquid-like connection while points gather or
spread. It is a deterministic Point Lab rendering experiment, not public
grammar, and it never changes the real point positions or the computed delta.
Dots stay fully opaque: the renderer hands visibility from the clean dots to
the blended shape during movement, then hands it back at the endpoint.
Each child contributes an equal share of its summary circle's final radius, so
the summary grows and shrinks with the number of children currently connected.
Combining starts slowly and accelerates as the points converge; revealing detail
uses the same motion in reverse.

<SyntaxPlayground mode="point-lab" initial="x" />

The lab tests transitions between point-chart states only. Every example uses
the real package from this checkout; it is not a separate demo renderer.
