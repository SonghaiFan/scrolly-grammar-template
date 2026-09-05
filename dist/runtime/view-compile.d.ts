import type { ViewSpec } from '../types/index.js';
import type { ChartIdiomRegistry } from '../charts/index.js';
import { resolveSceneTransition } from '../transitions/index.js';
export interface StepTransition {
    scene?: string[];
}
export interface CompileResult {
    sceneTransition: ReturnType<typeof resolveSceneTransition>;
    effectiveViewSpec: ViewSpec | null;
}
export declare function createViewCompiler(idioms: ChartIdiomRegistry): {
    compileEffectiveView: (viewSpec: ViewSpec, stepTransition?: StepTransition) => CompileResult;
    compileTransitionSource: (viewSpec: ViewSpec | null | undefined, stepTransition?: StepTransition) => CompileResult;
};
