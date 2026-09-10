import { createChartTypeRegistry, registerChartModules } from '../charts/index.js';
import { CHART_RUNTIME_DEPS } from './chart-deps.js';
// Explicit registrations are shared for compatibility. Each transition takes a
// registry snapshot so a later registration cannot change its compiled frames.
export const chartRegistry = createChartTypeRegistry();
const factories = new Map();
const builtins = {
    bar: () => import('../charts/bar/plugin.js'),
    line: () => import('../charts/line/plugin.js'),
    point: () => import('../charts/point/plugin.js'),
    unit: () => import('../charts/unit/plugin.js')
};
export function registerChartType(chartType) {
    chartRegistry.register(chartType);
    factories.delete(chartRegistry.get(chartType.key).key);
}
export function registerChartModule(module) {
    registerChartModules(chartRegistry, [module], CHART_RUNTIME_DEPS);
    const chartType = chartRegistry.get(module.plugin.key);
    factories.set(chartType.key, { chartType, plugin: module.plugin });
}
function instantiate(key, deps) {
    const chartType = chartRegistry.get(key);
    const factory = chartType && factories.get(chartType.key);
    return factory && factory.chartType === chartType ? factory.plugin.createChartType(deps) : chartType;
}
export function snapshotChartRegistry(deps) {
    const registry = createChartTypeRegistry();
    for (const key of chartRegistry.types())
        registry.register(instantiate(key, deps));
    return registry;
}
export function availableChartTypes() {
    return [...new Set([...Object.keys(builtins), ...chartRegistry.types()])].sort();
}
export async function transitionRegistry(spec, deps = CHART_RUNTIME_DEPS) {
    const key = String(spec.mark ?? '');
    let chartType = instantiate(key, deps);
    if (!chartType) {
        const load = builtins[key];
        if (!load)
            throw new Error(`Unsupported chart type: ${key}`);
        const module = await load();
        // Honor a registration made while the built-in module was loading.
        chartType = instantiate(key, deps) ?? module.plugin.createChartType(deps);
    }
    const registry = createChartTypeRegistry();
    if (!chartType)
        throw new Error(`Unsupported chart type: ${key}`);
    registry.register(chartType);
    return registry;
}
