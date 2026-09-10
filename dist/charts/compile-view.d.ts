import type { SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
export interface SceneTransitionInput {
    scene?: string[];
    selection?: unknown;
    axis?: unknown;
    detail?: unknown;
}
/**
 * Compile one view with one explicitly selected chart-type compiler.
 *
 * Keeping the compiler explicit is important: authoring `bar()` must not load
 * the manifest (and therefore every other built-in chart type) just to emit a spec.
 */
export declare function compileViewWithCompiler(viewSpec: ViewSpec, sceneTransition: SceneTransitionInput, compiler: SpecCompiler, stateOperations?: StateOperations): ViewSpec;
