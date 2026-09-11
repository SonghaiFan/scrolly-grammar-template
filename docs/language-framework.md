# Language framework and roadmap

> **Source of truth:** this page defines VisDelta's public words, working features,
> and development plan. Unfinished ideas are clearly marked instead of being shown
> as usable API. Last checked against the `0.2.0` candidate on 11 September 2026.

## Status vocabulary

<div class="language-status-grid">
  <div><span class="language-status is-available">Available</span><p>You can use it now. It has code, types, tests, documentation, and a live example.</p></div>
  <div><span class="language-status is-partial">Partial</span><p>You can use it, but it does not yet work equally well for every chart type.</p></div>
  <div><span class="language-status is-developing">Developing</span><p>We plan to support it, but the name or behavior may still change.</p></div>
  <div><span class="language-status is-research">Research</span><p>A design question or candidate capability. Names and scope may change.</p></div>
  <div><span class="language-status is-unsupported">Unsupported</span><p>It does not work in the current version.</p></div>
</div>

An item becomes **Available** only when the code, public types, tests,
documentation, and live example all agree. Existing code alone does not make a
feature ready for users.

## How the language works

With VisDelta, you describe what a chart looks like before and after a change.
VisDelta works out the difference and shows the movement between them. This is
what “declarative chart language” means here. Scrolling is only one way to
control that movement.

<div class="language-pipeline">
  <div><strong>Data</strong><span>rows and named sources</span></div>
  <b>→</b><div><strong>Transform</strong><span>change the rows</span></div>
  <b>→</b><div><strong>Chart</strong><span>describe one state</span></div>
  <b>→</b><div><strong>Difference</strong><span>compare two states</span></div>
  <b>→</b><div><strong>Transition</strong><span>plan the movement</span></div>
  <b>→</b><div><strong>Frame</strong><span>show any point from 0…1</span></div>
  <b>→</b><div><strong>Control</strong><span>time, input, scroll, route</span></div>
</div>

### Canonical terms

| Term | Meaning | Not the same as |
| --- | --- | --- |
| **Data** | Inline rows, `{ values }`, URL input, or a named dataset | A transformed table |
| **Transform** | An ordered change to the data, such as filter, fold, combine, sort, or limit | A visual transition |
| **Chart state** | A chart description returned by `area()`, `bar()`, `line()`, `point()`, or `unit()`; changing it creates a new state and leaves the old one alone | A chart already drawn on a web page |
| **Chart type** | A chart family such as area, bar, line, point, or unit | A layout change within one chart type |
| **Mapping** | A link from a data field to x, y, color, or size | Pixel geometry |
| **Scale** | A function that maps a data domain into a screen range | Its visible axis or grid |
| **Axis** | The visible ticks, grid, and title that explain a scale | The scale function itself |
| **Marks** | Data-shaped objects such as bars, points, and lines | An axis or legend |
| **Match** | The rule that says which item in the first state is the same item in the second | Array position |
| **Enter / stay / exit** | Whether an item appears, remains, or disappears | Its position or opacity alone |
| **Difference** | What changed between two chart states; the API name is `delta()` | An animation timeline |
| **Step** | One ordered part of a transition | A complete transition |
| **Order** | Which transition step runs first, for example `['y', 'x']` | Builder call history |
| **Transition** | The movement between two states of the same chart type | A scroll event |
| **Frame** | The exact picture at one progress value from 0…1 | A new chart state |
| **Control** | A source of progress: time, slider, button, scroll, gesture, or route | The transition itself |
| **Runtime** | The code that draws and controls a chart on the page | The words used to describe a chart |
| **Plugin** | An extra chart type that VisDelta can load and draw | A transition between different chart types |

### How a transition is built

VisDelta first asks what changed, then turns the answer into a small list of
steps. Matching tells it which items should move in place. Enter and exit tell
it which items should appear or disappear. Order tells it which step runs first.

```text
Two chart states
  → find the difference
  → match the same items
  → find entering and exiting items
  → build ordered steps
  → show the frame at progress 0…1
```

The core rule is simple: **the marks and their axis must agree in every frame.**
For this reason, an x or y step changes the whole chart part—not just the bars:

```text
x step = x scale + x axis + marks
y step = y scale + y axis + marks
```

Therefore `flip({ order: ["x", "y"] })` reads as “change x first, then y.” If
an old and new axis cannot be smoothly interpolated, VisDelta fades between them
inside the same step instead of replacing the axis at the first frame.

Current and intended default policies are:

| What changed | Default steps | Status |
| --- | --- | --- |
| Value or scale | Scale + axis + marks together | Available for bar |
| Category order | Axis ticks + marks together | Available for bar |
| Flip | Ordered x and y steps | Available |
| Stacked ↔ grouped | Ordered x and y steps for the destination layout | Available |
| Split/merge with a stable scale | Enter/exit + marks; axis stays still | Available |
| Point summary ↔ detail | Set the view with its summary marks, then move the points | Available |
| Filter with automatic rescale | Exit first, then scale + axis + remaining marks | Developing |
| Add data with automatic rescale | Scale + axis + existing marks, then enter | Developing |

Forward and reverse evaluation must be deterministic. A separately authored
reverse pair must show the same steps backward at `1 - p`; it must not choose a
different animation path.

## Grammar map

The public language is divided into seven grammar families. A method belongs to one primary family even when it influences another layer.

### 1. Data grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `bar(rows)` and other inline inputs | Available | Bind row arrays directly |
| `bar({ values: rows })` | Available | Explicit inline source object |
| `bar(url)` / `{ url, type? }` | Available | Load CSV or JSON through D3 |
| `bar("dataset")` + `transition(..., { data })` | Available | Resolve a named source from the data map passed to the transition |
| `filter`, `fold`, `bin`, `aggregate`, `sort`, `limit`, `timeUnit` transforms | Available | Execute in declared order; Arquero is required |
| Streaming or incremental data sources | Developing | Intended data-source category; no public contract yet |
| Reactive query graph | Research | Possible future derivation model |

### 2. Chart setup

| Syntax | Status | Contract |
| --- | --- | --- |
| `.data()` | Available | Replace the bound source immutably |
| `.x()` / `.y()` | Available | Bind primary position channels |
| `.channel()` | Available | Bind an arbitrary named channel |
| `.color()` | Available | Literal, field, or composite hue/luminance encoding |
| `.size()` | Available | Quantitative size mapping where the chart type supports it |
| `.key()` | Available | Tell VisDelta how to match the same item between states |
| `.tooltip()` | Available | Declare tooltip fields and labels |
| `.sort()` | Available | Append ordered sort transforms |
| `.toSpec()` | Available | Produce a detached serializable view state |
| Published JSON Schema and schema validation | Developing | `$schema` vocabulary exists; distributable validation is not complete |

<SyntaxPlayground initial="measure" compact />

### 3. Chart changes

These groups explain what changed in plain language. They are not animation
effects; the transition planner decides how to show them.

| Family | Public syntax | Status | Meaning |
| --- | --- | --- | --- |
| **Change data membership** | `.where()` | Available | Keep matching rows and remove the others across chart types |
| **Change attention** | `.highlight()` | Partial | Keep every row; selective visual emphasis is available for bar, line, and point |
| **Change the view** | `.focus()` | Partial | Keep every row; fit Bar categories, Line x, or Point x and y around a subset |
| **Change a value or mapping** | change `.x()`, `.y()`, `.color()`, `.size()` | Available | Show the same items through another measure or visual property |
| **Change detail** | `.breakdown()`, `.rollup()`, `.segment()` | Partial | Split into detail or combine into totals; bar has the richest path |
| **Change layout or axis** | `.flip()`, `.axis()`, `.layout()` | Partial | Available across relevant chart types, with different rendering depth |
| **Add labels or help** | titles, descriptions, tooltip metadata | Partial | Titles and tooltips exist; one shared annotation grammar is still developing |

<SyntaxPlayground initial="filter" compact />

<SyntaxPlayground initial="focus" compact />

<SyntaxPlayground initial="highlight" compact />

<SyntaxPlayground initial="split" compact />

<SyntaxPlayground initial="flip" compact />

### 4. Chart types

Chart types are classified by the question they help a reader answer—not only
by the shape drawn in SVG.

| Chart family | Reader question | Current language |
| --- | --- | --- |
| **Comparison** | How do categories differ? | `bar()` — Available |
| **Trend** | How does a value change over an ordered dimension? | `line()` and `area()` — Available |
| **Composition over time** | How do parts of a total change over an ordered dimension? | stacked `area()` — Available |
| **Relationship** | How do two quantities relate? | `point()` — Available |
| **Countable magnitude** | How many concrete units are there? | `unit()` — Available |
| **Distribution** | What is the shape, spread, or density? | Developing; point aggregation is partial coverage |
| **Part-to-whole** | How does a whole divide into parts? | Research; possible `arc()` family |
| **Matrix and density** | How do two categorical/continuous axes combine? | Research; possible `rect()` family |
| **Editorial annotation** | What should the reader notice or read? | Research; possible `text()`/annotation family |

| Chart type | Status | Current role | Transition evaluation |
| --- | --- | --- | --- |
| `bar()` | Available | Categorical comparison, filtering, reversible split/merge, grouped/stacked layout | Cached frame data |
| `line()` | Available | Ordered trends, keyed point/path changes, sliding windows, and staged reversible total/series changes | Reconstructs frames |
| `point()` | Available | Quantitative relationships and reversible summary/detail changes | Cached frame data |
| `unit()` | Available | Countable units, grids, groups, timelines, dodge | Reconstructs frames |
| `area()` | Available | Ordered magnitude, explicit baseline, and reversible total/stacked composition | Cached frame data |
| `rect()` / heatmap | Research | Candidate matrix and density chart type | Not implemented |
| `arc()` | Research | Candidate part-to-whole chart type | Not implemented |
| `text()` / annotation marks | Research | Candidate editorial annotation chart type | Not implemented |

The research rows are a taxonomy of likely language space, not release promises.

<SyntaxPlayground initial="area" compact />

<SyntaxPlayground initial="line" compact />

<SyntaxPlayground initial="point" compact />

<SyntaxPlayground initial="unit" compact />

### 5. Differences and transitions

| Syntax | Status | Contract |
| --- | --- | --- |
| `delta(from, to)` | Available | DOM-free semantic comparison |
| `transition(from, to, options)` | Available | Create a seekable controller between two states of the same chart type |
| `.progress(0…1)` | Available | Synchronously evaluate any normalized frame |
| `.play({ duration, from, to })` | Available | Time-drive progress in either direction |
| `.pause()`, `.resize()`, `.destroy()` | Available | Runtime lifecycle control |
| `.transition({ duration, ease, stagger })` | Available | Endpoint transition metadata |
| Cached frame data for line and unit | Developing | Bar and point already use cached evaluation |
| Transition such as bar → line | Unsupported | Both endpoints must currently use the same chart type |
| Cross-type transition compiler | Research | Requires matching and geometry rules beyond the current contract |

### 6. Controls

| Control | Status | Current use |
| --- | --- | --- |
| Time | Available | `.play()` |
| Numeric progress | Available | `.progress(value)` |
| Buttons and keyboard | Available | Application calls the transition controller |
| Scroll, gesture, route, audio, or external clock | Available as integration | Applications can map any signal to progress; no dedicated syntax is needed |
| Declarative `control()` objects | Developing | Possible shared grammar for common controls |

The control stays outside the transition: one transition can use scroll today
and a slider tomorrow without changing its two chart states.

### 7. Runtime and extension grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `defineChartType()` | Available | Define a chart-type plugin factory |
| `defineChartModule()` | Available | Define a lazy chart implementation carried by a chart state |
| `state.chartModule()` | Available | Let an imported builder work without global registration |
| `registerChartModule()` | Available | Make a module available to plain JSON specs |
| Focused `visdelta/bar` entry | Available | Lightweight bar authoring |
| Focused `visdelta/area` entry | Available | Lightweight area authoring |
| Focused `visdelta/point` entry | Available | Lightweight point authoring |
| Focused `visdelta/line` entry | Available | Lightweight line authoring |
| Focused `visdelta/unit` entry | Developing | Available through the complete entry; a dedicated public subpath is not shipped |
| Automatic builder generation | Not planned | Each chart owns meaningful chart-specific chain methods; the core does not guess them |

## What “partial” means for current chart types

The five chart types are all usable, but they are not yet symmetric. The roadmap
closes these differences while new chart modules expose gaps in the ontology.

| Capability | Area | Bar | Line | Point | Unit |
| --- | --- | --- | --- | --- | --- |
| Immutable builder | Available | Available | Available | Available | Available |
| Same-type transition | Available | Available | Available | Available | Available |
| Cached arbitrary-frame evaluation | Available | Available | Developing | Available | Developing |
| `.where()` row filtering | Available | Available | Available; internal gaps stay disconnected by default | Available | Available |
| `.focus()` view fitting | Available on x | Available | Available on x | Available on x and y | Developing |
| Selective `.highlight()` rendering | Available by layer | Available | Available | Available | Developing |
| Detail changes | Total/stacked exact reverse | Split/merge | Cut, move, connect series/single | Set view, then move points; exact reverse | Not currently a primary change |
| Axis/layout changes | Axis; curves developing | Flip, grouped, stacked, ordered steps | Flip and axis | Flip and axis | Grid, group, timeline, dodge |
| Focused package entry | Available | Available | Available | Available | Developing |

## Development plan

This order prioritizes conceptual integrity over adding isolated features.

### Live-documentation coverage

The side-by-side editor is part of the language acceptance surface, not a marketing demo. Current coverage is tracked explicitly:

| Grammar family | Inline coverage now | Status |
| --- | --- | --- |
| Data | Inline rows and `.where()` transform path | Method-level transform examples Developing |
| Visualization/encoding | Editable x, y, key, color, measure changes | Available |
| Chart changes | Editable filtering, value, detail, layout, and axis examples | Available |
| Chart types | Editable area, bar, line, point, and unit examples | Available |
| Delta/transition | Editable endpoints plus delta inspector, progress, and playback | Available |
| Controls | Time and numeric progress controls | Declarative control examples Developing |
| Runtime/extensions | Runtime is exercised by every editor | Plugin-authoring editor Developing |

The target is one colocated side-by-side editor for every public syntax section. Until that target is complete, missing editor coverage remains visible here as development work.

### Milestone A — language contract

<span class="language-status is-developing">Developing</span>

1. Keep this page aligned with exports, types, tests, and live examples.
2. Publish machine-readable schemas for ViewSpec, Delta, and transition options.
3. Keep terminology and fluent method names plain, direct, and consistent.
4. Make documentation checks fail when an Available capability loses its executable example.

### Milestone B — chart-type parity

<span class="language-status is-developing">Developing</span>

1. Add a focused entry for unit.
2. Extend cached seek evaluation to line and unit.
3. Add selective highlight rendering to unit.
4. Document and test every chart-specific detail, layout, and axis change.

### Milestone C — control abstraction

<span class="language-status is-developing">Developing</span>

1. Specify a common progress-control interface.
2. Treat scroll, buttons, gestures, routes, timers, and media clocks as adapters.
3. Define ownership and cleanup rules for every control adapter.
4. Keep direct controller use as the minimal integration path.

### Milestone D — new chart types

<span class="language-status is-research">Research</span>

Evaluate area, rect/heatmap, arc, and annotation charts only after Milestone B
establishes a repeatable parity checklist. Each new chart type must define its
mapping defaults, matching rule, supported changes, transition evaluation,
lifecycle behavior, focused module boundary, tests, and inline playground.

### Milestone E — transitions between chart types

<span class="language-status is-research">Research</span>

Do not expose bar-to-line syntax until VisDelta has explicit item-matching rules,
compatibility rules, an intermediate-shape strategy, and deterministic seek
behavior. A visually attractive morph without those contracts would weaken the language.

## Maintenance rules

When code and this page disagree, the status must be corrected in the same change:

1. **New proposal:** add it as Research with no public syntax promise.
2. **Accepted design:** move it to Developing and define its intended layer and acceptance tests.
3. **Implementation work:** keep it Developing until exports, types, tests, and live docs agree.
4. **Public release:** move it to Available or Partial and record exact boundaries.
5. **Behavior removal:** mark it deprecated before removal; do not silently rewrite old examples.
6. **Every pull request:** identify which language term, grammar family, chart type, and status row changed.

The [interactive reference](/reference) remains the detailed API contract. The [live syntax examples](/examples) are executable acceptance examples. This page owns classification, terminology, status, and roadmap.
