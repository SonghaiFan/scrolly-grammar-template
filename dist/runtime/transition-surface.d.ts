import type { AnyRecord } from '../types.js';
import type { ChartTypeRegistry } from '../charts/index.js';
export declare function createTransitionSurface(from: AnyRecord, to: AnyRecord, options: AnyRecord, chartTypes: ChartTypeRegistry): {
    view: Element;
    commitMount(): void;
    rollbackMount(): void;
    progress(value: number): void;
    resize(): void;
    destroy(): void;
};
