import type { ChartDeps, ChartType, ChartPlugin, CompilerContext, IntermediateSpec, MarginSpec, Renderer, SpecCompiler, StateOperations, TransitionPlan, ViewSpec } from '../types/index.js';
export declare const DEFAULT_SCENES: readonly ["selection", "axis", "detail", "mapping"];
export declare const DEFAULT_STATE_OPERATIONS: StateOperations;
export interface ChartTypeConfig<S extends ViewSpec = ViewSpec> {
    key: string;
    transitionEvaluation?: 'cached' | 'reconstruct';
    scenes?: string[];
    stateOperations?: StateOperations;
    renderer?: Renderer<S>;
    createRenderer?: (deps: ChartDeps) => Renderer<S>;
    createChart?: (deps: ChartDeps) => ChartType<S>;
    prepareSpec?: (spec: S) => S;
    defaults?: {
        margin?: (spec: S) => Partial<MarginSpec>;
    };
    inspect?: Record<string, unknown>;
    transition?: {
        plan?: (prev: S | null, next: S | null) => TransitionPlan;
        intermediateSpecs?: (prev: S, next: S) => IntermediateSpec<S>[];
        intermediateSpec?: (prev: S, next: S) => IntermediateSpec<S> | null;
    };
    createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}
export declare function defineChartType<S extends ViewSpec = ViewSpec>(config: ChartTypeConfig<S>): ChartPlugin<S>;
export declare function identityPrepare<S extends ViewSpec>(spec: S): S;
export declare function emptyTransitionPlan(): TransitionPlan;
export declare function defaultMargin(): Partial<MarginSpec>;
export declare function normalizeChartType<S extends ViewSpec = ViewSpec>(chartType: Partial<ChartType<S>> & {
    key: string;
}, createSpecCompiler?: ((context: CompilerContext) => SpecCompiler) | null): ChartType<S>;
