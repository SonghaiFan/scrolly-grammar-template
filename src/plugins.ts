/** Plugin registration without importing Story or built-in chart renderers. */
export { defineChartIdiom } from './charts/plugin.js';
export { registerChartIdiom, registerChartModule, availableChartIdioms } from './runtime/chart-registry.js';
export type { ChartIdiomConfig } from './charts/plugin.js';
export type { ChartPlugin, ChartIdiom, ChartDeps, ViewSpec, Renderer, SpecCompiler } from './types/index.js';
