---
layout: home

hero:
  name: VisDelta
  text: Declare states. Control frames.
  tagline: Describe two chart states. VisDelta finds the difference and lets you play or scrub the change.
  actions:
    - theme: brand
      text: Start building
      link: /getting-started
    - theme: alt
      text: Read the design rules
      link: /language-framework

features:
  - title: Safe chart states
    details: Make many new states from one chart without changing the original.
  - title: Meaningful differences
    details: Compare data, mappings, matching keys, filters, axes, layout, and detail.
  - title: Scrubbable movement
    details: Play by time or show any exact frame with a progress value from 0 to 1.
  - title: External control
    details: Buttons, sliders, gestures, routes, timers, or scroll can provide the same normalized progress value.
  - title: Chart-owned behavior
    details: Each chart module owns its marks and transitions while the core stays chart-agnostic.
  - title: Small building blocks
    details: Import only the chart and transition pieces your project needs.
---

## The language in one line

<div class="ontology-flow">
  <code>Chart state</code><span>to</span><code>Difference</code><span>to</span><code>Transition</code><span>to</span><code>Control</code>
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

The chart states describe the two endpoints. VisDelta finds what changed and
turns that difference into a transition that can be controlled independently
of scrolling.

## Try the real runtime

<TransitionWorkbench />

Continue into the complete twelve-scenario [Bar Lab](/transition-lab) or
[Point Lab](/point-lab) to edit endpoint declarations, scrub frames, reverse
animations, and inspect their computed differences.

## Core and controls

<div class="doc-decision-grid">
  <div><strong><code>transition()</code></strong><p>Two states of the same chart type, with direct play and progress control.</p></div>
  <div><strong>Application controls</strong><p>Buttons, sliders, gestures, routes, and timers set progress from 0 to 1.</p></div>
  <div><strong>Plugins</strong><p>Add another chart type while keeping the same state, difference, transition, and control model.</p></div>
</div>

Start with the [design rules](/language-framework) for the language and module
boundaries. Continue to the [interactive API reference](/reference) for exact
runtime contracts.
