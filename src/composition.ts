/**
 * Integration surface for driver packages such as `@scrollylite/scrollytelling`.
 *
 * End users should normally import `scrollylite`, `scrollylite/bar`, or
 * `scrollylite/transition`. This module intentionally exposes the lower-level
 * renderer contracts needed to build navigation, scroll, gesture, or route
 * orchestration without making those drivers part of the transition library.
 */
export { applyTransforms } from './data/transforms.js';
export { chartModules } from './charts/manifest.js';
export {
  defaultScrollProgress,
  hasScrollAction,
  normalizeActionEvent,
  normalizeActionTokens
} from './runtime/actions.js';
export { createChartRuntimeDeps } from './runtime/chart-deps.js';
export {
  availableChartIdioms,
  chartRegistry,
  registerChartIdiom,
  registerChartModule,
  snapshotChartRegistry
} from './runtime/chart-registry.js';
export { renderChartShell } from './runtime/chart-shell.js';
export { domainTransforms, loadData, viewRows } from './runtime/data.js';
export { createViewRenderer } from './runtime/view-renderer.js';
export { createViewCompiler } from './runtime/view-compile.js';
export { clamp, dash, escapeHtml, uniqueTokens } from './runtime/utils.js';
export {
  clearSceneTransitionProgress,
  installTransitionProgress,
  SCROLL_TRANSITION_NAME
} from './transition-progress.js';
export {
  externalizeScrollyViewSpec,
  withNarrative
} from './scrolly-meta.js';
export { cloneState } from './grammar/view-state.js';
export { diffViewStates } from './grammar/diff.js';
export { inferTransition } from './grammar/infer-transition.js';

export type {
  ActionEvent,
  AnyRecord,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  ScrollRuntime,
  StoryRuntime
} from './types.js';
export type {
  LayoutSpec,
  StepActionInput,
  StepActionToken,
  StepDefinition,
  StepSpec,
  StorySpec,
  ThemeSpec,
  ViewSpec
} from './types/index.js';
