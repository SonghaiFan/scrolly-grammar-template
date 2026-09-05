import { externalizeScrollyViewSpec } from '../scrolly-meta.js';
import { compileViewSpec, resolveSceneTransition, withSceneTransitionDefaults } from '../transitions/index.js';
export function createViewCompiler(idioms) {
    const entries = new Map();
    for (const key of idioms.types()) {
        const idiom = idioms.get(key);
        const compiler = idiom.createSpecCompiler?.({});
        if (compiler)
            entries.set(key, { compiler, scenes: [...idiom.scenes], stateOperations: idiom.stateOperations });
    }
    return { compileEffectiveView, compileTransitionSource };
    function compileEffectiveView(viewSpec, stepTransition = {}) {
        const entry = entries.get(idioms.get(viewSpec)?.key ?? '');
        const authoredViewSpec = externalizeScrollyViewSpec(viewSpec);
        const sceneTransition = resolveSceneTransition(authoredViewSpec, stepTransition, entry ?? idioms.get(viewSpec));
        const effectiveViewSpec = compileViewSpec(withSceneTransitionDefaults(authoredViewSpec, sceneTransition), sceneTransition, entry);
        return { sceneTransition, effectiveViewSpec: externalizeScrollyViewSpec(effectiveViewSpec) };
    }
    function compileTransitionSource(viewSpec, stepTransition = {}) {
        if (!viewSpec || !viewSpec['mark'] || viewSpec['mark'] === 'text') {
            return { effectiveViewSpec: null, sceneTransition: { scene: [], focus: null, guide: null, granularity: null } };
        }
        return compileEffectiveView(viewSpec, stepTransition);
    }
}
