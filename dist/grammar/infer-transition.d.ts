import type { ViewSpec } from '../types/index.js';
type SpecLike = ViewSpec | {
    toSpec(): ViewSpec;
} | null | undefined;
/** Classify endpoint semantics only; builder provenance is not animation input. */
export declare function inferTransition(previous: SpecLike, next: SpecLike): string[];
export {};
