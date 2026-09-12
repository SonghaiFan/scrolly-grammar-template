import type { SelectionSpec, DetailSpec, AxisSpec, ViewSpec } from '../types/index.js';
import {
  serializeViewSpec,
  specState
} from '../spec-meta.js';
import { compileViewWithCompiler } from '../charts/compile-view.js';
import type { SpecCompilerEntry } from '../charts/index.js';

export const SCENE_TRANSITIONS = ['selection', 'axis', 'detail', 'mapping'] as const;
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

export function resolveSceneTransition(viewSpec: ViewSpec = {}, stepTransition: StepTransition = {}, compilerEntry?: { scenes: readonly string[] }): SceneTransition {
  const supportedScenes: readonly string[] = compilerEntry?.scenes ?? SCENE_TRANSITIONS;
  const state = specState(viewSpec);
  const scene = uniqueTokens([...(stepTransition.scene || [])]).filter(
    (token) => SCENE_TRANSITIONS.includes(token as SceneTransitionType) && supportedScenes.includes(token)
  );

  return {
    scene,
    selection: scene.includes('selection') ? (state.selection || null) : null,
    axis: scene.includes('axis') ? (state.axis || null) : null,
    detail: scene.includes('detail') ? (state.detail || null) : null
  };
}

export function compileViewSpec(viewSpec: ViewSpec, sceneTransition: SceneTransition, compilerEntry?: SpecCompilerEntry): ViewSpec {
  if (!compilerEntry?.compiler) return viewSpec;

  return serializeViewSpec(compileViewWithCompiler(
    viewSpec,
    sceneTransition,
    compilerEntry.compiler,
    compilerEntry.stateOperations
  ));
}

export function hasScene(sceneTransition: SceneTransition | null | undefined, type: string): boolean {
  return Boolean(sceneTransition?.scene?.includes(type));
}

function normalizeToken(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function uniqueTokens(values: unknown[]): string[] {
  return [...new Set(values.map(normalizeToken).filter(Boolean))];
}
