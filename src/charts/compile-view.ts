import type { SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
import { externalizeScrollyViewSpec, narrativeState } from '../scrolly-meta.js';
import { cloneViewSpec } from './compiler-utils.js';

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
export function compileViewWithCompiler(
  viewSpec: ViewSpec,
  sceneTransition: SceneTransitionInput,
  compiler: SpecCompiler,
  stateOperations: StateOperations = {}
): ViewSpec {
  const rendererKey = String(viewSpec.mark ?? '');
  const context = { rendererKey };
  const compiled = stateOperationOrder(viewSpec, sceneTransition, compiler, stateOperations).reduce(
    (compiledSpec, entry) => {
      const handler = compiler.operations[entry.operation];
      return handler ? handler(compiledSpec, entry.operationSpec, context) : compiledSpec;
    },
    compiler.base(cloneViewSpec(viewSpec), context)
  );

  return externalizeScrollyViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}

const STATE_APPLICATION_ORDER = ['focus', 'granularity', 'guide'] as const;
const DEFAULT_STATE_OPERATION: StateOperations = {
  focus: 'filter',
  guide: 'coordinate',
  granularity: 'aggregate'
};

interface StateOperationEntry {
  operation: string;
  operationSpec: unknown;
}

function stateOperationOrder(
  viewSpec: ViewSpec,
  sceneTransition: SceneTransitionInput,
  compiler: SpecCompiler,
  configuredOperations: StateOperations
): StateOperationEntry[] {
  const supported = Object.keys(compiler.operations);
  const state = narrativeState(viewSpec) as unknown as Record<string, unknown>;
  const transition = sceneTransition as Record<string, unknown>;
  const operations: StateOperations = {
    ...DEFAULT_STATE_OPERATION,
    ...configuredOperations
  };

  return STATE_APPLICATION_ORDER
    .map((stateKey) => {
      const operationSpec = state[stateKey] || transition[stateKey] || null;
      const operation = operationForState(stateKey, operationSpec as Record<string, unknown> | null, operations);
      return { operation, operationSpec };
    })
    .filter((entry) => entry.operationSpec != null && supported.includes(entry.operation));
}

function operationForState(
  stateKey: string,
  operationSpec: Record<string, unknown> | null,
  operations: StateOperations
): string {
  if (stateKey === 'focus' && operationSpec?.['mode'] === 'highlight') return 'highlight';
  return operations[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}

function pruneCompiledViewSpec(spec: ViewSpec): ViewSpec {
  const next = { ...spec } as ViewSpec & Record<string, unknown>;
  if (Array.isArray(next['transform']) && !(next['transform'] as unknown[]).length) delete next['transform'];
  if (next['encoding'] && !Object.keys(next['encoding'] as object).length) delete next['encoding'];
  return next;
}

function pruneConsumedSceneState(spec: ViewSpec): ViewSpec {
  const next = cloneViewSpec(spec) as ViewSpec & { narrative?: Record<string, unknown> };
  const state = next.narrative?.['state'] as Record<string, unknown> | undefined;
  if (!state) return next;

  delete state['focus'];
  delete state['guide'];
  delete state['granularity'];
  if (!Object.keys(state).length) delete next.narrative?.['state'];
  return next;
}
