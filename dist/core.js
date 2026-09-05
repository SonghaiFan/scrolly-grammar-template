import { cloneState } from './grammar/view-state.js';
import { diffViewStates } from './grammar/diff.js';
import { externalizeScrollyViewSpec } from './scrolly-meta.js';
/** Resolve an immutable builder or plain spec into a detached view spec. */
export function visualizationSpec(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Expected a visualization instance or view spec.');
    }
    return externalizeScrollyViewSpec(cloneState(typeof input.toSpec === 'function' ? input.toSpec() : input));
}
/** Compute the declarative difference between two same-idiom visualizations. */
export function delta(from, to) {
    const source = visualizationSpec(from);
    const target = visualizationSpec(to);
    if (!source.mark || source.mark !== target.mark) {
        throw new Error('delta() requires two visualizations of the same chart idiom.');
    }
    return diffViewStates(source, target);
}
export { diffViewStates };
