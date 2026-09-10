import type { ChannelSpec, FilterSpec, SelectionSpec, SemanticKey, ViewSpec } from '../types/index.js';
type AnyRecord = Record<string, unknown>;
interface ObjectSpec {
    key?: string | string[] | null;
    semantic?: SemanticKey;
}
interface AxisOrder {
    order: string[];
    duration?: number;
    stagger?: unknown;
}
export declare function compileFilter(spec: ViewSpec, operationSpec?: SelectionSpec): ViewSpec;
export declare function compileHighlight(spec: ViewSpec, operationSpec?: SelectionSpec): ViewSpec;
export declare function compileCartesianCoordinate(spec: ViewSpec, operationSpec?: AnyRecord): ViewSpec;
export declare function compileCartesianScale(spec: ViewSpec, operationSpec?: AnyRecord): ViewSpec;
export declare function identitySpec(spec: ViewSpec): ViewSpec;
export declare function withObject(spec: ViewSpec, objectSpec?: ObjectSpec): ViewSpec;
export declare function withSceneState(spec: ViewSpec, sceneStatePatch?: AnyRecord): ViewSpec;
export declare function semanticToMeta(semanticKey?: SemanticKey): AnyRecord;
export declare function semanticPartToMeta(part: unknown): unknown;
export declare function selectorToFilter(selector?: AnyRecord): FilterSpec | null;
export declare function resolveAxisOrder(axisSpec: AnyRecord | undefined, orientation: string): AxisOrder;
export declare function channelFromField(fieldOrChannel: string | ChannelSpec, title: string | null, fallbackType: string): ChannelSpec;
export declare function mergeXYChannel(base: ChannelSpec | undefined, override: (string | ChannelSpec) | undefined, fallbackType: string): ChannelSpec;
export declare function channelScaleType(channel?: ChannelSpec): string;
export declare function aggregateFieldSpec(channelSpec: ChannelSpec | undefined, fallbackField: string, fallbackAs: string, fallbackOp: string): {
    op: string;
    field: string;
    as: string;
};
export declare function cloneViewSpec(viewSpec: ViewSpec): ViewSpec;
export declare function cloneEncoding(encoding?: ViewSpec['encoding']): Record<string, ChannelSpec | ChannelSpec[]>;
export declare function copyDefined(source: AnyRecord, keys: string[]): AnyRecord;
export {};
