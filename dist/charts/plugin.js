export const DEFAULT_SCENES = ['selection', 'axis', 'detail', 'mapping'];
export const DEFAULT_STATE_OPERATIONS = {
    selection: 'filter',
    axis: 'coordinate',
    detail: 'aggregate'
};
export function defineChartType(config) {
    if (!config.key)
        throw new Error('Chart type plugin requires a key.');
    const { createSpecCompiler } = config;
    const scenes = uniqueStrings(config.scenes ?? [...DEFAULT_SCENES]);
    const stateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(config.stateOperations ?? {}) };
    function createChartType(deps) {
        const chartType = config.createChart
            ? config.createChart(deps)
            : createRuntimeChartType(config, deps);
        return normalizeChartType({
            ...chartType,
            transitionEvaluation: config.transitionEvaluation ?? chartType.transitionEvaluation,
            key: chartType.key || config.key,
            scenes: chartType.scenes ?? scenes,
            stateOperations: { ...stateOperations, ...(chartType.stateOperations ?? {}) }
        }, createSpecCompiler);
    }
    return {
        key: config.key,
        scenes,
        stateOperations,
        createChartType,
        ...(createSpecCompiler ? { createSpecCompiler } : {})
    };
}
export function identityPrepare(spec) {
    return spec;
}
export function emptyTransitionPlan() {
    return {};
}
export function defaultMargin() {
    return {};
}
export function normalizeChartType(chartType, createSpecCompiler) {
    const prepareSpec = chartType.prepareSpec ?? identityPrepare;
    const resolveTransitionPlan = chartType.resolveTransitionPlan ?? emptyTransitionPlan;
    const renderer = chartType.renderer;
    if (!renderer)
        throw new Error(`Chart type "${chartType.key}" must provide a renderer function.`);
    const scenes = uniqueStrings([...(chartType.scenes ?? DEFAULT_SCENES)]);
    const stateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(chartType.stateOperations ?? {}) };
    return {
        ...chartType,
        scenes,
        stateOperations,
        renderer,
        prepareSpec,
        resolveTransitionPlan,
        defaultMargin: chartType.defaultMargin ?? defaultMargin,
        ...(createSpecCompiler ? { createSpecCompiler } : {})
    };
}
// ─── Internal ─────────────────────────────────────────────────────────────────
function createRuntimeChartType(config, deps) {
    const renderer = config.createRenderer
        ? config.createRenderer(deps)
        : config.renderer;
    return {
        key: config.key,
        renderer,
        prepareSpec: config.prepareSpec ?? identityPrepare,
        resolveTransitionPlan: config.transition?.plan ?? emptyTransitionPlan,
        canonicalTransitionPair: config.transition?.canonicalPair,
        intermediateSpecs: config.transition?.intermediateSpecs,
        defaultMargin: config.defaults?.margin ?? defaultMargin,
        inspect: config.inspect ?? {},
        scenes: config.scenes,
        stateOperations: config.stateOperations
    };
}
function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean).map(String))];
}
