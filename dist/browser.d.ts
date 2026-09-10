import * as core from './index.js';
import type { Visualization, TransitionOptions } from './transition.js';
export { availableChartTypes, bar, delta, diffViewStates, defineChartType, line, point, registerChartType, registerChartModule, unit, visualizationSpec } from './index.js';
export declare function transition(from: Visualization, to: Visualization, options?: Partial<TransitionOptions>): Promise<core.VisualizationTransition>;
