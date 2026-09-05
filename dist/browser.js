import * as core from './index.js';
export { availableChartIdioms, bar, delta, diffViewStates, defineChartIdiom, line, point, registerChartIdiom, registerChartModule, story, unit, visualizationSpec, seq, Seq, createPage, page } from './index.js';
function dependencies(options) {
    const globals = globalThis;
    return { ...options, d3: options.d3 ?? globals['d3'],
        aq: options.aq ?? globals['aq'] };
}
export function transition(from, to, options = {}) {
    return core.transition(from, to, { ...options, ...dependencies(options) });
}
export function createStory(spec, options = {}) {
    return core.createStory(spec, dependencies(options));
}
export function createChart(spec, options = {}) {
    return core.createChart(spec, { ...options, ...dependencies(options) });
}
export function chart(spec, options = {}) {
    return core.chart(spec, dependencies(options));
}
export function render(spec, options = {}) {
    return core.render(spec, dependencies(options));
}
// Only dependency lookup and global installation differ from the ESM entry.
const browserApi = { ...core, transition, createStory, createChart, chart, render };
globalThis['ScrollyLite'] = browserApi;
globalThis['sl'] = browserApi;
