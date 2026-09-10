import { ViewState } from '../grammar/view-state.js';
import { titleize } from '../labels.js';
import type { ChannelSpec, FilterSpec, SelectionSpec, AxisSpec, SortOrder, TransitionSpec, ViewSpec } from '../types/index.js';
export { titleize };
export declare function normalizeDataSource(data: unknown): unknown;
export declare class ChartState<S extends ViewSpec = ViewSpec> extends ViewState<S> {
    toSpec(): Omit<S, '__grammar'>;
    /** Chart subclasses override this without importing the global chart manifest. */
    protected compileSpec(spec: ViewSpec): ViewSpec;
    data(data: unknown): this;
    x(field: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    y(field: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    channel(name: string, field: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    color(valueOrField: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    size(field: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    key(fields: string | string[]): this;
    tooltip(items: string | ChannelSpec | Array<string | ChannelSpec>): this;
    sort(field: string, order?: SortOrder): this;
    transition(timing: TransitionSpec): this;
    where(selector: string | Record<string, unknown> | FilterSpec): this;
    highlight(selector: string | Record<string, unknown> | FilterSpec, options?: {
        opacity?: number;
    }): this;
    /** Configure the chart axes, scales, orientation, and transition order. */
    axis(config?: Partial<AxisSpec>): this;
}
export declare function channelFrom(field: string | ChannelSpec, options?: Partial<ChannelSpec>): ChannelSpec;
export declare function colorFrom(valueOrField: string | ChannelSpec, options?: Partial<ChannelSpec>): ChannelSpec;
export declare function selectorFrom(selector?: string | Record<string, unknown> | FilterSpec): SelectionSpec;
