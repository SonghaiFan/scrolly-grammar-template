import type { DiffResult, ViewSpec } from './types/index.js';
import { diffViewStates } from './grammar/diff.js';
export type Visualization = ViewSpec | {
    toSpec(): ViewSpec;
};
/** Resolve an immutable builder or plain spec into a detached view spec. */
export declare function visualizationSpec(input: Visualization): ViewSpec;
/** Compute the declarative difference between two same-idiom visualizations. */
export declare function delta(from: Visualization, to: Visualization): DiffResult;
export { diffViewStates };
export type { DiffResult, ViewSpec } from './types/index.js';
