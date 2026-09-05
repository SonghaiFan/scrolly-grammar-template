import type { SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
export interface SceneTransitionInput {
    scene?: string[];
    focus?: unknown;
    guide?: unknown;
    granularity?: unknown;
}
/**
 * Compile one view with one explicitly selected idiom compiler.
 *
 * Keeping the compiler explicit is important: authoring `bar()` must not load
 * the manifest (and therefore every other built-in idiom) just to emit a spec.
 */
export declare function compileViewWithCompiler(viewSpec: ViewSpec, sceneTransition: SceneTransitionInput, compiler: SpecCompiler, stateOperations?: StateOperations): ViewSpec;
