import type { FilterSpec } from '../types/index.js';
/** A small comparison grammar, deliberately not JavaScript evaluation. */
export declare function normalizeFilter(value: unknown): FilterSpec;
export declare function filterPredicate(input: unknown): (row: Record<string, unknown>) => boolean;
/** Evaluate a normalized predicate; shared by filtering, highlighting and crop. */
export declare function matchesFilter(row: Record<string, unknown>, filter: FilterSpec): boolean;
