import { createChartIdiomRegistry, registerChartModules } from '../charts/index.js';
import { CHART_RUNTIME_DEPS } from './chart-deps.js';
// Explicit registrations are shared for compatibility. Each transition takes a
// registry snapshot so a later registration cannot change its compiled frames.
export const chartRegistry = createChartIdiomRegistry();
const factories = new Map();
const builtins = {
    bar: () => import('../charts/bar/plugin.js'),
    line: () => import('../charts/line/plugin.js'),
    point: () => import('../charts/point/plugin.js'),
    unit: () => import('../charts/unit/plugin.js')
};
export function registerChartIdiom(idiom) {
    chartRegistry.register(idiom);
    factories.delete(chartRegistry.get(idiom.key).key);
}
export function registerChartModule(module) {
    registerChartModules(chartRegistry, [module], CHART_RUNTIME_DEPS);
    const idiom = chartRegistry.get(module.plugin.key);
    factories.set(idiom.key, { idiom, plugin: module.plugin });
}
function instantiate(key, deps) {
    const idiom = chartRegistry.get(key);
    const factory = idiom && factories.get(idiom.key);
    return factory && factory.idiom === idiom ? factory.plugin.createChartIdiom(deps) : idiom;
}
export function snapshotChartRegistry(deps) {
    const registry = createChartIdiomRegistry();
    for (const key of chartRegistry.types())
        registry.register(instantiate(key, deps));
    return registry;
}
export function availableChartIdioms() {
    return [...new Set([...Object.keys(builtins), ...chartRegistry.types()])].sort();
}
export async function transitionRegistry(spec, deps = CHART_RUNTIME_DEPS) {
    const key = String(spec.mark ?? '');
    let idiom = instantiate(key, deps);
    if (!idiom) {
        const load = builtins[key];
        if (!load)
            throw new Error(`Unsupported chart idiom: ${key}`);
        const module = await load();
        // Honor a registration made while the built-in module was loading.
        idiom = instantiate(key, deps) ?? module.plugin.createChartIdiom(deps);
    }
    const registry = createChartIdiomRegistry();
    if (!idiom)
        throw new Error(`Unsupported chart idiom: ${key}`);
    registry.register(idiom);
    return registry;
}
