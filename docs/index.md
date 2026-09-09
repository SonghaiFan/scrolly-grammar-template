---
layout: home

hero:
  name: VisDelta
  text: Declare states. Control frames.
  tagline: A declarative visualization language for immutable chart states, semantic delta, and seekable animated transitions.
  actions:
    - theme: brand
      text: Start building
      link: /getting-started
    - theme: alt
      text: Explore the language map
      link: /language-framework

features:
  - title: Immutable declarations
    details: Branch one visualization into many states without mutating the source declaration.
  - title: Semantic delta
    details: Compare endpoint meaning across identity, encoding, focus, guide, transform, and granularity.
  - title: Seekable motion
    details: Play by time or sample any deterministic frame with a normalized progress value.
  - title: Driver independent
    details: Buttons, scroll, sliders, gestures, routes, and timers can drive the same transition.
  - title: Deliberately decoupled
    details: Story layout, navigation, and scroll drivers live in the temporary scrollytelling package, not the transition runtime.
  - title: Focused modules
    details: Import core, bar, transition, plugins, or the lower-level composition adapter according to your integration.
---

## The language in one line

<div class="ontology-flow">
  <code>Visualization</code><span>to</span><code>Delta</code><span>to</span><code>Transition</code><span>to</span><code>Driver</code>
</div>

```js
import * as d3 from "d3";
import { bar } from "visdelta/bar";
import { transition } from "visdelta/transition";
import "visdelta/style.css";

const revenue = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const profit = revenue.y("profit");
const change = await transition(revenue, profit, { target: "#chart", d3 });

change.progress(0.42);
change.play({ duration: 800 });
```

The visualization declarations describe what the endpoints mean. VisDelta computes what changed and turns that delta into a transition that can be controlled independently of scrolling.

## Try the real runtime

<TransitionWorkbench />

Continue into the [complete twelve-scenario bar transition lab](/transition-lab)
to edit endpoint declarations, scrub frames, reverse animations, and inspect
their computed deltas.

## Core and drivers

<div class="doc-decision-grid">
  <div><strong><code>transition()</code></strong><p>Two same-idiom visualization states with direct play and progress control.</p></div>
  <div><strong>Application drivers</strong><p>Buttons, sliders, gestures, routes, and timers supply normalized progress.</p></div>
  <div><strong>Scrollytelling adapter</strong><p>The extracted private package owns Story, Seq, layout, navigation, and native scroll progress until it moves into ScrollyTale.</p></div>
</div>

Start with the [language framework and roadmap](/language-framework) for the normative taxonomy and implementation status. Continue to the [interactive API reference](/reference) for detailed runtime contracts.
