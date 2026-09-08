import * as core from './index.js';
import type { Visualization, TransitionOptions } from './transition.js';

export { availableChartIdioms, bar, delta, diffViewStates, defineChartIdiom,
  line, point, registerChartIdiom, registerChartModule, unit,
  visualizationSpec } from './index.js';

type BrowserOptions = Record<string, unknown>;
function dependencies(options: BrowserOptions): BrowserOptions {
  const globals = globalThis as unknown as Record<string, unknown>;
  return { ...options, d3: options.d3 ?? globals['d3'],
    aq: options.aq ?? globals['aq'] };
}

export function transition(from: Visualization, to: Visualization, options: Partial<TransitionOptions> = {}) {
  return core.transition(from, to, { ...options, ...dependencies(options) } as TransitionOptions);
}

// Only dependency lookup and global installation differ from the ESM entry.
const browserApi = { ...core, transition };
(globalThis as unknown as Record<string, unknown>)['ScrollyLite'] = browserApi;
(globalThis as unknown as Record<string, unknown>)['sl'] = browserApi;
