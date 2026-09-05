import type { FocusSpec, GranularitySpec, GuideSpec, TransitionSpec, ViewSpec } from '../types/index.js';
import { DEFAULT_TIMING } from '../timing.js';
import {
  externalizeScrollyViewSpec,
  narrativeState,
  narrativeTransition,
  withNarrative
} from '../scrolly-meta.js';
import { compileViewWithCompiler } from '../charts/compile-view.js';
import type { SpecCompilerEntry } from '../charts/index.js';

export const SCENE_TRANSITIONS = ['focus', 'guide', 'granularity', 'observation'] as const;
export type SceneTransitionType = typeof SCENE_TRANSITIONS[number];

interface SceneTransition {
  scene: string[];
  focus?: FocusSpec | null;
  guide?: GuideSpec | null;
  granularity?: GranularitySpec | null;
}

interface StepTransition {
  scene?: string[];
}

export function resolveSceneTransition(viewSpec: ViewSpec = {}, stepTransition: StepTransition = {}, compilerEntry?: { scenes: readonly string[] }): SceneTransition {
  const supportedScenes: readonly string[] = compilerEntry?.scenes ?? SCENE_TRANSITIONS;
  const state = narrativeState(viewSpec);
  const scene = uniqueTokens([...(stepTransition.scene || [])]).filter(
    (token) => SCENE_TRANSITIONS.includes(token as SceneTransitionType) && supportedScenes.includes(token)
  );

  return {
    scene,
    focus: scene.includes('focus') ? (state.focus || null) : null,
    guide: scene.includes('guide') ? (state.guide || null) : null,
    granularity: scene.includes('granularity') ? (state.granularity || null) : null
  };
}

export function withSceneTransitionDefaults(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec {
  const transition: TransitionSpec = { ...narrativeTransition(viewSpec) };

  if ((hasScene(sceneTransition, 'observation') || hasScene(sceneTransition, 'granularity')) && transition.stagger == null) {
    transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
  }

  return withNarrative(viewSpec, { transition });
}

export function compileViewSpec(viewSpec: ViewSpec, sceneTransition: SceneTransition, compilerEntry?: SpecCompilerEntry): ViewSpec {
  if (!compilerEntry?.compiler) return viewSpec;

  return externalizeScrollyViewSpec(compileViewWithCompiler(
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
