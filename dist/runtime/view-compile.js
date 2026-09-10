import { serializeViewSpec } from '../spec-meta.js';
import { compileViewSpec, resolveSceneTransition, withSceneTransitionDefaults } from '../transitions/index.js';
export function createViewCompiler(chartTypes) {
    const entries = new Map();
    for (const key of chartTypes.types()) {
        const chartType = chartTypes.get(key);
        const compiler = chartType.createSpecCompiler?.({});
        if (compiler)
            entries.set(key, { compiler, scenes: [...chartType.scenes], stateOperations: chartType.stateOperations });
    }
    return { compileEffectiveView, compileTransitionSource };
    function compileEffectiveView(viewSpec, stepTransition = {}) {
        const entry = entries.get(chartTypes.get(viewSpec)?.key ?? '');
        const authoredViewSpec = serializeViewSpec(viewSpec);
        const sceneTransition = resolveSceneTransition(authoredViewSpec, stepTransition, entry ?? chartTypes.get(viewSpec));
        const effectiveViewSpec = compileViewSpec(withSceneTransitionDefaults(authoredViewSpec, sceneTransition), sceneTransition, entry);
        return { sceneTransition, effectiveViewSpec: serializeViewSpec(effectiveViewSpec) };
    }
    function compileTransitionSource(viewSpec, stepTransition = {}) {
        if (!viewSpec || !viewSpec['mark'] || viewSpec['mark'] === 'text') {
            return { effectiveViewSpec: null, sceneTransition: { scene: [], selection: null, axis: null, detail: null } };
        }
        return compileEffectiveView(viewSpec, stepTransition);
    }
}
