import * as core from './index.js';
import type { Visualization, TransitionOptions } from './transition.js';
export { availableChartIdioms, bar, delta, diffViewStates, defineChartIdiom, line, point, registerChartIdiom, registerChartModule, unit, visualizationSpec } from './index.js';
export declare function transition(from: Visualization, to: Visualization, options?: Partial<TransitionOptions>): Promise<core.VisualizationTransition>;
