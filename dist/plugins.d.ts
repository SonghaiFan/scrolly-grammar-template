/** Plugin registration without importing Story or built-in chart renderers. */
export { defineChartType } from './charts/plugin.js';
export { defineChartModule } from './charts/module.js';
export { ChartState, channelFrom, colorFrom, normalizeDataSource, selectorFrom } from './charts/authoring.js';
export { compileViewWithCompiler } from './charts/compile-view.js';
export { registerChartType, registerChartModule, availableChartTypes } from './runtime/chart-registry.js';
export type { ChartTypeConfig } from './charts/plugin.js';
export type { ChartModule, LoadedChartModule } from './charts/module.js';
export type { ChartPlugin, ChartType, ChartDeps, ViewSpec, Renderer, SpecCompiler } from './types/index.js';
