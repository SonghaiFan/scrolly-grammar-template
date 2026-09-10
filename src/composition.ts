/**
 * Integration surface for applications that provide their own controls.
 *
 * End users should normally import `visdelta`, `visdelta/bar`, or
 * `visdelta/transition`. This module intentionally exposes the lower-level
 * renderer contracts needed to connect navigation, scroll, gesture, or route
 * progress without putting those controls inside the transition engine.
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
  availableChartTypes,
  chartRegistry,
  registerChartType,
  registerChartModule,
  snapshotChartRegistry,
  transitionRegistry
} from './runtime/chart-registry.js';
export { renderChartShell } from './runtime/chart-shell.js';
export { domainTransforms, loadData, viewRows } from './runtime/data.js';
export { createViewRenderer } from './runtime/view-renderer.js';
export { createViewCompiler } from './runtime/view-compile.js';
export { clamp, dash, escapeHtml, uniqueTokens } from './runtime/utils.js';
export {
  clearSceneTransitionProgress,
  installTransitionProgress,
  VISDELTA_TRANSITION_NAME
} from './transition-progress.js';
export {
  serializeViewSpec,
  withSpecMeta
} from './spec-meta.js';
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
