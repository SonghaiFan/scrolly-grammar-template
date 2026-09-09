import * as core from './index.js';
export { availableChartIdioms, bar, delta, diffViewStates, defineChartIdiom, line, point, registerChartIdiom, registerChartModule, unit, visualizationSpec } from './index.js';
function dependencies(options) {
    const globals = globalThis;
    return { ...options, d3: options.d3 ?? globals['d3'],
        aq: options.aq ?? globals['aq'] };
}
export function transition(from, to, options = {}) {
    return core.transition(from, to, { ...options, ...dependencies(options) });
}
// Only dependency lookup and global installation differ from the ESM entry.
const browserApi = { ...core, transition };
globalThis['VisDelta'] = browserApi;
globalThis['vd'] = browserApi;
