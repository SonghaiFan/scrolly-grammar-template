import type { ChannelSpec, SelectionSpec, ViewSpec } from '../../types/index.js';
interface LineState {
    selection: SelectionSpec | null;
    seriesField: string | null;
}
interface LineSeries {
    key: string;
    rows: Record<string, unknown>[];
}
export declare function lineState(spec?: ViewSpec, enc?: Record<string, ChannelSpec>): LineState;
export declare function lineSeries(rows: Record<string, unknown>[], seriesField: string | null): LineSeries[];
export declare function selectedLineXScale(rows: Record<string, unknown>[], channel: ChannelSpec | undefined, chart: Record<string, unknown>, selection: SelectionSpec | null, deps: Record<string, unknown>): unknown;
export {};
