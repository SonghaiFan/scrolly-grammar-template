import * as core from './index.js';
import type { Visualization, TransitionOptions } from './transition.js';
import type { ChartOptions, RuntimeOptions } from './types.js';

export { availableChartIdioms, bar, delta, diffViewStates, defineChartIdiom,
  line, point, registerChartIdiom, registerChartModule, story, unit,
  visualizationSpec, seq, Seq, createPage, page } from './index.js';

type BrowserOptions = Partial<RuntimeOptions> & Record<string, unknown>;
function dependencies(options: BrowserOptions): RuntimeOptions {
  const globals = globalThis as unknown as Record<string, unknown>;
  return { ...options, d3: options.d3 ?? globals['d3'] as RuntimeOptions['d3'],
    aq: options.aq ?? globals['aq'] as RuntimeOptions['aq'] };
}

export function transition(from: Visualization, to: Visualization, options: Partial<TransitionOptions> = {}) {
  return core.transition(from, to, { ...options, ...dependencies(options) });
}
export function createStory(spec: Parameters<typeof core.createStory>[0], options: BrowserOptions = {}) {
  return core.createStory(spec, dependencies(options));
}
export function createChart(spec: Parameters<typeof core.createChart>[0], options: Partial<ChartOptions> = {}) {
  return core.createChart(spec, { ...options, ...dependencies(options) });
}
export function chart(spec: Parameters<typeof core.chart>[0], options: BrowserOptions = {}) {
  return core.chart(spec, dependencies(options));
}
export function render(spec: Parameters<typeof core.render>[0], options: BrowserOptions = {}) {
  return core.render(spec, dependencies(options));
}

// Only dependency lookup and global installation differ from the ESM entry.
const browserApi = { ...core, transition, createStory, createChart, chart, render };
(globalThis as unknown as Record<string, unknown>)['ScrollyLite'] = browserApi;
(globalThis as unknown as Record<string, unknown>)['sl'] = browserApi;
