export {
  availableChartIdioms,
  createChart,
  createPage,
  createStory,
  registerChartIdiom,
  registerChartModule
} from "./scrollylite.js";
export {
  bar,
  line,
  point,
  story,
  unit
} from "./grammar/index.js";
export { defineChartIdiom } from "./charts/plugin.js";
export { transition } from "./transition.js";
export { delta, diffViewStates, visualizationSpec } from "./core.js";
export type { Visualization } from "./core.js";
export type { TransitionOptions, PlayOptions, VisualizationTransition } from "./transition.js";

// ── Sequence builder ──────────────────────────────────────────────────────────
export { seq, Seq } from "./seq.js";
export type { SeqState } from "./seq.js";

// ── Short-form runtime aliases (import * as sl from 'scrollylite') ────────────
// These wrappers accept either a compiled StorySpec OR a Seq object directly.
// sl.chart(seq, opts)  — standalone animated chart
// sl.render(seq, opts) — full scrollytelling story with layout
// sl.page(spec, opts)  — layout shell only
export { chart, page, render } from './story.js';

export type {
  ActionEvent,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  ScrollRuntime,
  StoryRuntime
} from "./types.js";
