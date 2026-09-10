import type { ChartPlugin, ViewSpec } from '../types/index.js';
export interface LoadedChartModule<S extends ViewSpec = ViewSpec> {
    plugin: ChartPlugin<S>;
}
/** A lightweight reference that loads one chart implementation on demand. */
export interface ChartModule<S extends ViewSpec = ViewSpec> {
    key: string;
    load(): Promise<LoadedChartModule<S>>;
}
export declare function defineChartModule<S extends ViewSpec = ViewSpec>(module: ChartModule<S>): ChartModule<S>;
