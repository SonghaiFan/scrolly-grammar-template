import type { BarLayout, BarOrientation, CanonicalTransitionPair, IntermediateSpec, TransitionPlan, ViewSpec } from '../../types/index.js';
export declare function resolveBarTransitionPlan(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): TransitionPlan;
interface BarInternalState {
    orientation: BarOrientation;
    barLayout: BarLayout;
    categoryField: string | null;
    measureField: string | null;
    hasAxis: boolean;
    hasDetail: boolean;
    hasAggregate: boolean;
    segmentField: string | null;
    axisOrder: Record<string, unknown> | null;
}
export declare function barState(spec: ViewSpec | null | undefined): BarInternalState | null;
/**
 * Parent -> child is the canonical detail path. A child -> parent pair
 * reuses that exact path with inverted progress so split and merge cannot
 * acquire different seams, opacity changes, staggering, or step order.
 */
export declare function canonicalBarTransitionPair<S extends ViewSpec>(previousSpec: S, nextSpec: S): CanonicalTransitionPair<S>;
export declare function barCollapseIntermediateSpec(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): ViewSpec | null;
export declare function barSplitIntermediateSpec(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): ViewSpec | null;
export declare function barIntermediateSpecs(previousSpec: ViewSpec, nextSpec: ViewSpec): IntermediateSpec[];
export {};
