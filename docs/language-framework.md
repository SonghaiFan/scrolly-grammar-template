# Language framework and roadmap

> **Normative status:** this page is the source of truth for VisDelta's public language, implementation coverage, and development direction. It describes the intended whole system without presenting unfinished work as available API. Last aligned with the `0.2.0` candidate on 6 September 2026.

## Status vocabulary

<div class="language-status-grid">
  <div><span class="language-status is-available">Available</span><p>Public syntax exists, is typed, documented, tested, and has an executable example.</p></div>
  <div><span class="language-status is-partial">Partial</span><p>Public syntax exists, but behavior or transition quality is not yet consistent across idioms.</p></div>
  <div><span class="language-status is-developing">Developing</span><p>Accepted direction for the language, but not yet a public contract. Do not ship user code against it.</p></div>
  <div><span class="language-status is-research">Research</span><p>A design question or candidate capability. Names and scope may change.</p></div>
  <div><span class="language-status is-unsupported">Unsupported</span><p>Explicitly outside the current contract.</p></div>
</div>

An item moves to **Available** only when four things agree: implementation, exported types, behavioral tests, and this documentation with a live example. A code path by itself is not a public language feature.

## The ontology

VisDelta is a declarative visualization language with animation as a first-class evaluation model. Scrolling is one possible driver, not the definition of the system.

<div class="language-pipeline">
  <div><strong>Data</strong><span>rows and named sources</span></div>
  <b>→</b><div><strong>Transform</strong><span>derive the table</span></div>
  <b>→</b><div><strong>Visualization</strong><span>declare one immutable state</span></div>
  <b>→</b><div><strong>Delta</strong><span>compare endpoint meaning</span></div>
  <b>→</b><div><strong>Transition</strong><span>compile evaluable change</span></div>
  <b>→</b><div><strong>Frame</strong><span>sample progress 0…1</span></div>
  <b>→</b><div><strong>Driver</strong><span>time, input, scroll, route</span></div>
</div>

Composition sits around that pipeline:

```text
Seq   = ordered visualization states + text + mutable cursor
Story = datasets + layout + theme + views + narrated steps + actions
Runtime = mounted ownership, rendering, navigation, resize and teardown
```

### Canonical terms

| Term | Meaning | Not the same as |
| --- | --- | --- |
| **DataSource** | Inline rows, `{ values }`, URL input, or a named dataset | A transformed table |
| **Transform** | Ordered data operation such as filter, fold, aggregate, sort, or limit | A visual transition |
| **Visualization** | Immutable chart-state declaration returned by an idiom builder | A mounted SVG |
| **Idiom** | A visualization family with its own grammar and renderer | A Story layout |
| **Encoding** | Mapping from variables to channels such as x, y, color, or size | Pixel geometry |
| **State operation** | A semantic change: focus, observation, granularity, or guide | Playback timing |
| **Delta** | Endpoint comparison across encoding, identity, data, focus, guide, and granularity | An animation timeline |
| **Transition** | A controller that evaluates a same-idiom delta | A scroll event |
| **Frame** | Deterministic visual state at normalized progress | A new Visualization declaration |
| **Driver** | A source of progress or destination: time, slider, button, scroll, gesture, route | The Transition itself |
| **Seq** | Ordered state collection and navigation cursor | A complete page layout |
| **Story** | Serializable narrative composition | The mounted StoryRuntime |
| **Runtime** | DOM-owning execution of a chart, page, or Story spec | Authoring grammar |
| **Plugin** | Registered idiom renderer/compiler capability | Cross-idiom morphing |

## Grammar taxonomy

The public language is divided into eight grammar families. A method belongs to one primary family even when it influences another layer.

### 1. Data grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `bar(rows)` and other inline inputs | Available | Bind row arrays directly |
| `bar({ values: rows })` | Available | Explicit inline source object |
| `bar(url)` / `{ url, type? }` | Available | Load CSV or JSON through D3 |
| `bar("dataset")` + composition data map | Extracted | Named datasets are resolved by a driver package, not VisDelta core |
| `filter`, `fold`, `bin`, `aggregate`, `sort`, `limit`, `timeUnit` transforms | Available | Execute in declared order; Arquero is required |
| Streaming or incremental data sources | Developing | Intended data-source category; no public contract yet |
| Reactive query graph | Research | Possible future derivation model |

### 2. Visualization and encoding grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `.data()` | Available | Replace the bound source immutably |
| `.x()` / `.y()` | Available | Bind primary position channels |
| `.channel()` | Available | Bind an arbitrary named channel |
| `.color()` | Available | Literal, field, or composite hue/luminance encoding |
| `.size()` | Available | Quantitative size encoding where the idiom supports it |
| `.key()` | Available | Declare stable semantic identity |
| `.tooltip()` | Available | Declare tooltip fields and labels |
| `.sort()` | Available | Append ordered sort transforms |
| `.toSpec()` | Available | Produce a detached serializable view state |
| Published JSON Schema and schema validation | Developing | `$schema` vocabulary exists; distributable validation is not complete |

<SyntaxPlayground initial="measure" compact />

### 3. State-operation grammar

State operations explain *what kind of meaning changed*. They are more durable than renderer-specific animation names.

| Family | Public syntax | Status | Meaning |
| --- | --- | --- | --- |
| **Focus** | `.where()`, `.highlight()` | Partial | Filtering works across idioms; selective highlight rendering is currently bar-first |
| **Observation** | change `.x()`, `.y()`, `.color()`, `.size()` | Available | Observe the same entities through another measure or encoding |
| **Granularity** | `.breakdown()`, `.rollup()`, `.segment()` | Partial | Supported with idiom-specific semantics; bar has the richest path |
| **Guide** | `.flip()`, `.guide()`, `.layout()`, `.stage()` | Partial | Public across relevant idioms, with differing rendering depth |
| **Annotation** | titles, descriptions, tooltip metadata | Partial | Narrative and tooltip metadata exist; a unified annotation grammar is still developing |

<SyntaxPlayground initial="filter" compact />

<SyntaxPlayground initial="highlight" compact />

<SyntaxPlayground initial="split" compact />

<SyntaxPlayground initial="flip" compact />

### 4. Idiom grammar

Idioms are classified by the data relationship they help a reader perceive—not merely by SVG mark shape.

| Idiom family | Reader question | Current language |
| --- | --- | --- |
| **Comparison** | How do categories differ? | `bar()` — Available |
| **Trend** | How does a value change over an ordered dimension? | `line()` — Available |
| **Relationship** | How do two quantities relate? | `point()` — Available |
| **Countable magnitude** | How many concrete units are there? | `unit()` — Available |
| **Distribution** | What is the shape, spread, or density? | Developing; point aggregation is partial coverage |
| **Part-to-whole** | How does a whole divide into parts? | Research; possible `arc()` family |
| **Matrix and density** | How do two categorical/continuous axes combine? | Research; possible `rect()` family |
| **Editorial annotation** | What should the reader notice or read? | Research; possible `text()`/annotation family |

| Idiom | Status | Current role | Transition evaluation |
| --- | --- | --- | --- |
| `bar()` | Available | Categorical comparison, focus, reversible split/merge, grouped/stacked layout | Cached seek tracks |
| `line()` | Available | Ordered trends and multiple series | Reconstructs frames |
| `point()` | Available | Quantitative relationships and aggregation/detail | Reconstructs frames |
| `unit()` | Available | Countable units, grids, groups, timelines, dodge | Reconstructs frames |
| `area()` | Research | Candidate trend/composition idiom | Not implemented |
| `rect()` / heatmap | Research | Candidate matrix and density idiom | Not implemented |
| `arc()` | Research | Candidate part-to-whole idiom | Not implemented |
| `text()` / annotation marks | Research | Candidate editorial annotation idiom | Not implemented |

The research rows are a taxonomy of likely language space, not release promises.

<SyntaxPlayground initial="line" compact />

<SyntaxPlayground initial="point" compact />

<SyntaxPlayground initial="unit" compact />

### 5. Delta and transition grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `delta(from, to)` | Available | DOM-free semantic comparison |
| `transition(from, to, options)` | Available | Create a same-idiom seekable controller |
| `.progress(0…1)` | Available | Synchronously evaluate any normalized frame |
| `.play({ duration, from, to })` | Available | Time-drive progress in either direction |
| `.pause()`, `.resize()`, `.destroy()` | Available | Runtime lifecycle control |
| `.transition({ duration, ease, stagger })` | Available | Endpoint transition metadata |
| Cached tracks for line, point, and unit | Developing | Bar already uses cached evaluation |
| Cross-idiom transition such as bar → line | Unsupported | Endpoints must currently use the same idiom |
| Cross-idiom semantic morph compiler | Research | Requires an identity and geometry model beyond the current contract |

### 6. Driver grammar

| Driver | Status | Current use |
| --- | --- | --- |
| Time | Available | `.play()` |
| Numeric progress | Available | `.progress(value)` |
| Buttons and keyboard | Available | Application calls the transition controller |
| Native scroll | Extracted | Owned by the private `scrollytelling/` adapter |
| Step navigation | Extracted | Owned by the private `scrollytelling/` adapter |
| Gesture, route, audio, or external clock | Available as integration | Applications can map any signal to progress; no dedicated declarative syntax |
| Unified declarative `driver()` objects | Developing | Intended common grammar for non-Story drivers |

The architecture intentionally keeps Driver outside Transition: one transition can be controlled by scroll today and by a slider tomorrow without changing its endpoint declarations.

### 7. Composition grammar

| Syntax | Status | Owns |
| --- | --- | --- |
| `seq()` | Extracted | Private `scrollytelling/` package; planned for ScrollyTale |
| `story()` | Extracted | Private `scrollytelling/` package; planned for ScrollyTale |
| `story().add()` | Extracted | No longer exported by VisDelta core |
| `story().layout()` | Extracted | No longer exported by VisDelta core |
| `story().theme()` | Extracted | No longer exported by VisDelta core |
| Branching or graph narratives | Developing | Current Story and Seq are linear |
| Nested or parallel sequences | Research | Composition model not yet defined |

### 8. Runtime and extension grammar

| Syntax | Status | Contract |
| --- | --- | --- |
| `createChart()` / `chart()` | Extracted | Private `scrollytelling/` package |
| `createPage()` / `page()` | Extracted | Private `scrollytelling/` package |
| `createStory()` / `render()` | Extracted | Private `scrollytelling/` package |
| `defineChartIdiom()` | Available | Define an idiom plugin factory |
| `registerChartModule()` | Available | Register renderer/compiler capability before runtime creation |
| Focused `visdelta/bar` entry | Available | Lightweight bar authoring |
| Focused line, point, and unit entries | Developing | Available through the complete entry; dedicated public subpaths are not shipped |
| Automatic builder generation from plugins | Developing | Registration currently supplies runtime capability, not new fluent syntax automatically |

## What “partial” means for current idioms

The four idioms are all usable, but they are not yet symmetric. The roadmap should close these differences before multiplying the number of chart types.

| Capability | Bar | Line | Point | Unit |
| --- | --- | --- | --- | --- |
| Immutable builder | Available | Available | Available | Available |
| Same-idiom transition | Available | Available | Available | Available |
| Cached arbitrary-frame evaluation | Available | Developing | Developing | Developing |
| `.where()` filtering | Available | Available with range-oriented semantics | Available | Available |
| Selective `.highlight()` rendering | Available | Developing | Developing | Developing |
| Granularity operations | Split/merge | Series/single | Aggregate/detail | Not currently a primary scene |
| Guide/layout operations | Flip, grouped, stacked, staging | Flip and guide | Flip and guide | Grid, group, timeline, dodge |
| Focused package entry | Available | Developing | Developing | Developing |

## Development plan

This order prioritizes conceptual integrity over adding isolated features.

### Live-documentation coverage

The side-by-side editor is part of the language acceptance surface, not a marketing demo. Current coverage is tracked explicitly:

| Grammar family | Inline coverage now | Status |
| --- | --- | --- |
| Data | Inline rows and `.where()` transform path | Method-level transform examples Developing |
| Visualization/encoding | Editable x, y, key, color, measure changes | Available |
| State operations | Editable focus, observation, granularity, and guide examples | Available |
| Idioms | Editable bar, line, point, and unit examples | Available |
| Delta/transition | Editable endpoints plus delta inspector, progress, and playback | Available |
| Drivers | Time and numeric progress controls | Declarative driver examples Developing |
| Composition | Editable Seq and Story builders compiled to endpoint views | Available |
| Runtime/extensions | Runtime is exercised by every editor | Plugin-authoring editor Developing |

The target is one colocated side-by-side editor for every public syntax section. Until that target is complete, missing editor coverage remains visible here as development work.

### Milestone A — language contract

<span class="language-status is-developing">Developing</span>

1. Keep this page aligned with exports, types, tests, and live examples.
2. Publish machine-readable schemas for ViewSpec, Delta, Transition options, Seq, and StorySpec.
3. Define compatibility and deprecation rules for terminology and fluent methods.
4. Make documentation checks fail when an Available capability loses its executable example.

### Milestone B — idiom parity

<span class="language-status is-developing">Developing</span>

1. Add focused entries for line, point, and unit.
2. Extend cached seek evaluation beyond bar.
3. Make focus/highlight behavior explicit and consistent.
4. Document and test every idiom-specific granularity and guide operation.

### Milestone C — driver abstraction

<span class="language-status is-developing">Developing</span>

1. Specify a common progress-driver interface.
2. Treat scroll, buttons, gestures, routes, timers, and media clocks as adapters.
3. Separate driver ownership and teardown from Story layout.
4. Keep direct controller use as the minimal integration path.

### Milestone D — composition beyond a line

<span class="language-status is-developing">Developing</span>

1. Define branching without overloading the linear Seq cursor.
2. Decide whether reusable named states belong to Story, Seq, or a separate state registry.
3. Preserve serializability and deterministic navigation.

### Milestone E — new idioms

<span class="language-status is-research">Research</span>

Evaluate area, rect/heatmap, arc, and annotation idioms only after Milestone B establishes a repeatable parity checklist. Each new idiom must define its encoding defaults, identity model, state operations, transition evaluation, lifecycle behavior, focused module boundary, tests, and inline playground.

### Milestone F — cross-idiom transitions

<span class="language-status is-research">Research</span>

Do not expose bar-to-line syntax until VisDelta has an explicit cross-idiom identity model, semantic compatibility rules, intermediate geometry strategy, and deterministic seek behavior. A visually attractive morph without those contracts would weaken the language.

## Maintenance rules

When code and this page disagree, the status must be corrected in the same change:

1. **New proposal:** add it as Research with no public syntax promise.
2. **Accepted design:** move it to Developing and define its intended layer and acceptance tests.
3. **Implementation work:** keep it Developing until exports, types, tests, and live docs agree.
4. **Public release:** move it to Available or Partial and record exact boundaries.
5. **Behavior removal:** mark it deprecated before removal; do not silently rewrite old examples.
6. **Every pull request:** identify which ontology term, grammar family, idiom, and status row changed.

The [interactive reference](/reference) remains the detailed API contract. The [live syntax examples](/examples) are executable acceptance examples. This page owns classification, terminology, status, and roadmap.
