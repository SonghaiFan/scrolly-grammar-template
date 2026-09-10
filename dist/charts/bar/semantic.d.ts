import type { AggregateTransform, BarLayout, BarOrientation, BarSemanticState, DetailSpec, AxisSpec, ResolvedChartState, ViewSpec } from '../../types/index.js';
export declare function semanticBarState(spec: ViewSpec, semanticStateArg?: Partial<ResolvedChartState> | null): BarSemanticState;
export declare function barLayoutState(spec: ViewSpec, state?: Partial<ResolvedChartState>, aggregate?: AggregateTransform | AggregateTransform[] | null): BarLayout;
export declare function barAxisState({ orientation, layout, state }: {
    orientation: BarOrientation;
    layout: BarLayout;
    state?: Partial<ResolvedChartState>;
}): AxisSpec | null;
export declare function barDetailState({ layout, categoryField, measureField, segmentField, state }: {
    layout: BarLayout;
    categoryField: string | null;
    measureField: string | null;
    segmentField: string | null;
    state?: Partial<ResolvedChartState>;
}): DetailSpec | null;
export declare function barAggregateState(spec: ViewSpec): AggregateTransform | AggregateTransform[] | null;
export declare function barSegmentField(spec: ViewSpec, state?: Partial<ResolvedChartState>): string | null;
