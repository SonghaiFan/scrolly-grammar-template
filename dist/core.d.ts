import type { DiffResult, ViewSpec } from './types/index.js';
import { diffViewStates } from './grammar/diff.js';
import type { ChartModule } from './charts/module.js';
export type Visualization = ViewSpec | {
    toSpec(): ViewSpec;
    /** Runtime chart implementation carried by a chainable visualization. */
    chartModule?(): ChartModule<any>;
};
/** Read a visualization's chart module without adding it to serialized state. */
export declare function visualizationChartModule(input: Visualization): ChartModule<any> | null;
/** Resolve an immutable builder or plain spec into a detached view spec. */
export declare function visualizationSpec(input: Visualization): ViewSpec;
/** Compute the declarative difference between two states of the same chart type. */
export declare function delta(from: Visualization, to: Visualization): DiffResult;
export { diffViewStates };
export type { DiffResult, ViewSpec } from './types/index.js';
