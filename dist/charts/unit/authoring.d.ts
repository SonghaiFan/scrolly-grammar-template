import type { ViewSpec } from '../../types/index.js';
import { ChartState } from '../authoring.js';
export interface UnitViewState extends ViewSpec {
    mark: 'unit';
    unit?: Record<string, unknown>;
}
export declare function unit(data?: unknown): UnitState;
export declare class UnitState extends ChartState<UnitViewState> {
    chartModule(): import("../module.js").ChartModule<UnitViewState>;
    protected compileSpec(spec: ViewSpec): ViewSpec;
    value(field: string, options?: {
        maxUnits?: number;
    }): this;
    label(field: string): this;
    columns(value: number): this;
    radius(value: number): this;
    group(field: string, options?: Record<string, unknown>): this;
    timeline(field: string, options?: Record<string, unknown>): this;
    dodge(field: string, options?: Record<string, unknown>): this;
}
