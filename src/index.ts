import { builtInChartModules } from './charts/builtins.js';
import { registerChartModule as registerBuiltInChartModule } from './runtime/chart-registry.js';

builtInChartModules.forEach(registerBuiltInChartModule);

export {
  availableChartTypes,
  registerChartType,
  registerChartModule
} from "./runtime/chart-registry.js";
export {
  area,
  bar,
  D3_AREA_CURVE_NAMES,
  D3_CURVE_NAMES,
  line,
  point,
  unit
} from "./grammar/index.js";
export type { D3AreaCurveName, D3CurveName } from "./grammar/index.js";
export { defineChartType } from "./charts/plugin.js";
export { transition } from "./transition.js";
export { delta, diffViewStates, visualizationSpec } from "./core.js";
export type { Visualization } from "./core.js";
export type { TransitionOptions, PlayOptions, VisualizationTransition } from "./transition.js";
