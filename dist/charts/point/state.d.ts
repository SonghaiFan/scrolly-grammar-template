import type { CanonicalTransitionPair, ChannelSpec, IntermediateSpec, ViewSpec } from '../../types/index.js';
interface PointState {
    parentField: string | string[] | null;
    detailMode: string | null;
}
interface ParentAnchor {
    x: number;
    y: number;
}
export declare function pointState(spec?: ViewSpec, enc?: Record<string, ChannelSpec>): PointState;
/** Compile summary/detail as one reversible path: summary -> detail. */
export declare function canonicalPointTransitionPair<S extends ViewSpec>(previousSpec: S, nextSpec: S): CanonicalTransitionPair<S>;
/** Split a point flip into the authored first axis and then the second axis. */
export declare function pointIntermediateSpecs<S extends ViewSpec>(previousSpec: S, nextSpec: S): IntermediateSpec<S>[];
export declare function parentAnchors(rows: Record<string, unknown>[], parentField: string | string[] | null, positionForRow: (row: Record<string, unknown>) => {
    x: number;
    y: number;
}): Map<string, ParentAnchor>;
export declare function parentKey(row: Record<string, unknown>, parentField: string | string[] | null): string;
export declare function radiusScale(rows: Record<string, unknown>[], channel: ChannelSpec | null | undefined, fallback: number, d3: unknown, quantitativeDomain: (rows: unknown[], channel: unknown, floor?: number) => [number, number]): (row: Record<string, unknown>) => number;
export declare function defaultPointRadius(count: number): number;
export {};
