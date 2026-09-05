import type { AnyRecord } from '../types.js';
import type { ChartIdiomRegistry } from '../charts/index.js';
export declare function createTransitionSurface(from: AnyRecord, to: AnyRecord, options: AnyRecord, idioms: ChartIdiomRegistry): {
    view: Element;
    commitMount(): void;
    rollbackMount(): void;
    progress(value: number): void;
    resize(): void;
    destroy(): void;
};
