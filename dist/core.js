import { cloneState } from './grammar/view-state.js';
import { diffViewStates } from './grammar/diff.js';
import { serializeViewSpec } from './spec-meta.js';
/** Read a visualization's chart module without adding it to serialized state. */
export function visualizationChartModule(input) {
    if (!input || typeof input !== 'object' || typeof input.chartModule !== 'function')
        return null;
    return input.chartModule();
}
/** Resolve an immutable builder or plain spec into a detached view spec. */
export function visualizationSpec(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Expected a visualization instance or view spec.');
    }
    return serializeViewSpec(cloneState(typeof input.toSpec === 'function' ? input.toSpec() : input));
}
/** Compute the declarative difference between two states of the same chart type. */
export function delta(from, to) {
    const source = visualizationSpec(from);
    const target = visualizationSpec(to);
    if (!source.mark || source.mark !== target.mark) {
        throw new Error('delta() requires two states of the same chart type.');
    }
    return diffViewStates(source, target);
}
export { diffViewStates };
