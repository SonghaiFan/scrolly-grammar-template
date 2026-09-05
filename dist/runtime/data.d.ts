import type { TransformSpec } from '../types/index.js';
type AnyRecord = Record<string, unknown>;
export declare function loadData(dataSpec: Record<string, unknown>, d3: AnyRecord): Promise<Record<string, unknown[]>>;
export declare function viewRows(dataSpec: unknown, datasets: Record<string, unknown[]>): unknown[];
export declare function domainTransforms(transforms?: TransformSpec[]): TransformSpec[];
export {};
