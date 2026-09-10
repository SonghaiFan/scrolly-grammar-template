import type { SelectionSpec, DetailSpec, AxisSpec, ViewSpec } from '../types/index.js';
import type { SpecCompilerEntry } from '../charts/index.js';
export declare const SCENE_TRANSITIONS: readonly ["selection", "axis", "detail", "mapping"];
export type SceneTransitionType = typeof SCENE_TRANSITIONS[number];
interface SceneTransition {
    scene: string[];
    selection?: SelectionSpec | null;
    axis?: AxisSpec | null;
    detail?: DetailSpec | null;
}
interface StepTransition {
    scene?: string[];
}
export declare function resolveSceneTransition(viewSpec?: ViewSpec, stepTransition?: StepTransition, compilerEntry?: {
    scenes: readonly string[];
}): SceneTransition;
export declare function withSceneTransitionDefaults(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec;
export declare function compileViewSpec(viewSpec: ViewSpec, sceneTransition: SceneTransition, compilerEntry?: SpecCompilerEntry): ViewSpec;
export declare function hasScene(sceneTransition: SceneTransition | null | undefined, type: string): boolean;
export {};
