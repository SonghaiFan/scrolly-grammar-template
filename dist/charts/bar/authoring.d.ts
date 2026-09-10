import { ChartState } from '../authoring.js';
import type { BarLayout, ChannelSpec, FilterSpec, DetailSpec, AxisSpec, SemanticKey, TransitionOrder, ViewSpec } from '../../types/index.js';
export interface BarViewState extends ViewSpec {
    mark: 'bar';
    where?: FilterSpec[];
    detail?: DetailSpec | null;
    axis?: AxisSpec | null;
    aggregate?: unknown;
    semanticKey?: SemanticKey | null;
}
export declare function bar(data?: unknown): BarState;
export declare class BarState extends ChartState<BarViewState> {
    toSpec(): Omit<BarViewState, '__grammar'>;
    x(field: string | ChannelSpec, options?: Partial<ChannelSpec>): this;
    y(field: string | ChannelSpec, options?: Partial<ChannelSpec> | string): this;
    where(selector: string | Record<string, unknown> | FilterSpec | null): this;
    flip(options?: TransitionOrder & {
        domain?: unknown[];
        scale?: Record<string, unknown>;
    }): this;
    breakdown(segment?: string, options?: {
        category?: string;
        value?: string;
        by?: string | string[];
        layout?: BarLayout;
        op?: string;
        title?: string | false;
        color?: unknown;
        tooltip?: unknown;
        [key: string]: unknown;
    }): this;
    rollup(groupbyOrOptions?: string | string[] | {
        groupby?: string | string[];
        by?: string | string[];
        value?: string;
        as?: string;
        op?: string;
        color?: unknown;
        title?: string;
        [key: string]: unknown;
    } | null, options?: {
        groupby?: string | string[];
        by?: string | string[];
        value?: string;
        as?: string;
        op?: string;
        color?: unknown;
        title?: string;
        [key: string]: unknown;
    }): this;
    segment(fieldOrConfig?: string | {
        segment?: string;
        category?: string;
        value?: string;
        as?: [string, string];
        fields?: string[];
        labels?: Record<string, string>;
        categoryTitle?: string;
        valueTitle?: string;
        layout?: BarLayout;
        color?: ChannelSpec;
        domain?: unknown[];
        range?: unknown[];
        source?: string;
        groupby?: string[];
        key?: string | string[];
        tooltip?: unknown;
    }, maybeConfig?: Record<string, unknown>): this;
    layout(layout: BarLayout, options?: TransitionOrder): this;
}
