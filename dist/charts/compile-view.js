import { externalizeScrollyViewSpec, narrativeState } from '../scrolly-meta.js';
import { cloneViewSpec } from './compiler-utils.js';
/**
 * Compile one view with one explicitly selected idiom compiler.
 *
 * Keeping the compiler explicit is important: authoring `bar()` must not load
 * the manifest (and therefore every other built-in idiom) just to emit a spec.
 */
export function compileViewWithCompiler(viewSpec, sceneTransition, compiler, stateOperations = {}) {
    const rendererKey = String(viewSpec.mark ?? '');
    const context = { rendererKey };
    const compiled = stateOperationOrder(viewSpec, sceneTransition, compiler, stateOperations).reduce((compiledSpec, entry) => {
        const handler = compiler.operations[entry.operation];
        return handler ? handler(compiledSpec, entry.operationSpec, context) : compiledSpec;
    }, compiler.base(cloneViewSpec(viewSpec), context));
    return externalizeScrollyViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}
const STATE_APPLICATION_ORDER = ['focus', 'granularity', 'guide'];
const DEFAULT_STATE_OPERATION = {
    focus: 'filter',
    guide: 'coordinate',
    granularity: 'aggregate'
};
function stateOperationOrder(viewSpec, sceneTransition, compiler, configuredOperations) {
    const supported = Object.keys(compiler.operations);
    const state = narrativeState(viewSpec);
    const transition = sceneTransition;
    const operations = {
        ...DEFAULT_STATE_OPERATION,
        ...configuredOperations
    };
    return STATE_APPLICATION_ORDER
        .map((stateKey) => {
        const operationSpec = state[stateKey] || transition[stateKey] || null;
        const operation = operationForState(stateKey, operationSpec, operations);
        return { operation, operationSpec };
    })
        .filter((entry) => entry.operationSpec != null && supported.includes(entry.operation));
}
function operationForState(stateKey, operationSpec, operations) {
    if (stateKey === 'focus' && operationSpec?.['mode'] === 'highlight')
        return 'highlight';
    return operations[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}
function pruneCompiledViewSpec(spec) {
    const next = { ...spec };
    if (Array.isArray(next['transform']) && !next['transform'].length)
        delete next['transform'];
    if (next['encoding'] && !Object.keys(next['encoding']).length)
        delete next['encoding'];
    return next;
}
function pruneConsumedSceneState(spec) {
    const next = cloneViewSpec(spec);
    const state = next.narrative?.['state'];
    if (!state)
        return next;
    delete state['focus'];
    delete state['guide'];
    delete state['granularity'];
    if (!Object.keys(state).length)
        delete next.narrative?.['state'];
    return next;
}
