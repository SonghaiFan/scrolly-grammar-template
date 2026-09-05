import type { ViewSpec } from '../types/index.js';
import type { ChartIdiomRegistry, SpecCompilerEntry } from '../charts/index.js';
import { externalizeScrollyViewSpec } from '../scrolly-meta.js';
import {
  compileViewSpec,
  resolveSceneTransition,
  withSceneTransitionDefaults
} from '../transitions/index.js';

export interface StepTransition {
  scene?: string[];
}

export interface CompileResult {
  sceneTransition: ReturnType<typeof resolveSceneTransition>;
  effectiveViewSpec: ViewSpec | null;
}

export function createViewCompiler(idioms: ChartIdiomRegistry) {
  const entries = new Map<string, SpecCompilerEntry>();
  for (const key of idioms.types()) {
    const idiom = idioms.get(key)!;
    const compiler = idiom.createSpecCompiler?.({});
    if (compiler) entries.set(key, { compiler, scenes: [...idiom.scenes], stateOperations: idiom.stateOperations });
  }
  return { compileEffectiveView, compileTransitionSource };

function compileEffectiveView(viewSpec: ViewSpec, stepTransition: StepTransition = {}): CompileResult {
  const entry = entries.get(idioms.get(viewSpec)?.key ?? '');
  const authoredViewSpec = externalizeScrollyViewSpec(viewSpec);
  const sceneTransition = resolveSceneTransition(authoredViewSpec, stepTransition, entry ?? idioms.get(viewSpec));
  const effectiveViewSpec = compileViewSpec(
    withSceneTransitionDefaults(authoredViewSpec, sceneTransition),
    sceneTransition,
    entry
  );
  return { sceneTransition, effectiveViewSpec: externalizeScrollyViewSpec(effectiveViewSpec) };
}

function compileTransitionSource(viewSpec: ViewSpec | null | undefined, stepTransition: StepTransition = {}): CompileResult {
  if (!viewSpec || !(viewSpec as Record<string, unknown>)['mark'] || (viewSpec as Record<string, unknown>)['mark'] === 'text') {
    return { effectiveViewSpec: null, sceneTransition: { scene: [], focus: null, guide: null, granularity: null } };
  }
  return compileEffectiveView(viewSpec, stepTransition);
}
}
