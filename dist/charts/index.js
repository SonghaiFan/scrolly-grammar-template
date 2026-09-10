import { specUnit } from '../spec-meta.js';
import { normalizeChartType as normalizeChartPlugin } from './plugin.js';
export function createChartTypeRegistry() {
    const chartTypes = new Map();
    return {
        register(chartType) {
            const normalized = normalizeRegisteredChartType(chartType);
            chartTypes.set(normalized.key, normalized);
            return this;
        },
        get(markOrSpec) {
            const key = typeof markOrSpec === 'object'
                ? resolveMarkRendererKey(markOrSpec)
                : normalizeMarkRendererKey(markOrSpec);
            return chartTypes.get(key);
        },
        has(markOrSpec) {
            return Boolean(this.get(markOrSpec));
        },
        types() {
            return [...chartTypes.keys()].sort();
        }
    };
}
export function registerChartModules(registry, modules, deps = {}) {
    for (const module of modules) {
        const chartType = chartTypeFromModule(module, deps);
        registry.register(chartType);
    }
    return registry;
}
export function createSpecCompilerRegistry(modules, context = {}) {
    const entries = modules
        .map((module) => {
        const plugin = pluginFromModule(module);
        const key = normalizeMarkRendererKey(plugin.key);
        const compiler = plugin.createSpecCompiler ? plugin.createSpecCompiler(context) : null;
        if (!key || !compiler)
            return null;
        return [
            key,
            {
                compiler,
                scenes: [...plugin.scenes],
                stateOperations: { ...plugin.stateOperations }
            }
        ];
    })
        .filter((entry) => entry !== null);
    return Object.fromEntries(entries);
}
// ─── Mark key resolution ──────────────────────────────────────────────────────
export function normalizeMarkRendererKey(markOrRenderer) {
    return normalizeMarkToken(String(markOrRenderer ?? ''));
}
export function normalizeChartType(type) {
    return normalizeMarkRendererKey(type);
}
export function resolveMarkRendererKey(viewSpec) {
    if (specUnit(viewSpec))
        return 'unit';
    return normalizeMarkRendererKey(viewSpec.mark);
}
export function resolveChartType(viewSpec) {
    return resolveMarkRendererKey(viewSpec);
}
// ─── Internal ─────────────────────────────────────────────────────────────────
function normalizeRegisteredChartType(chartType) {
    const key = normalizeMarkRendererKey(chartType.key);
    if (!key)
        throw new Error('Chart type key is required.');
    const normalized = normalizeChartPlugin({ ...chartType, key });
    if (typeof normalized.renderer !== 'function') {
        throw new Error(`Chart type "${key}" must provide a renderer function.`);
    }
    return { ...normalized, key };
}
function chartTypeFromModule(module, deps) {
    const plugin = pluginFromModule(module);
    if (typeof plugin.createChartType === 'function') {
        return plugin.createChartType(deps);
    }
    throw new Error('Chart module must export plugin.createChartType(deps).');
}
function pluginFromModule(module) {
    if (!module.plugin)
        throw new Error('Chart module must export plugin.');
    return module.plugin;
}
function normalizeMarkToken(value) {
    return value.replace(/\s+/g, '').toLowerCase();
}
