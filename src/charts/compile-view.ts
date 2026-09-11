import type { SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
import { serializeViewSpec, specState } from '../spec-meta.js';
import { cloneViewSpec } from './compiler-utils.js';

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

  return serializeViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}

const STATE_APPLICATION_ORDER = ['selection', 'detail', 'axis'] as const;
const DEFAULT_STATE_OPERATION: StateOperations = {
  selection: 'filter',
  axis: 'coordinate',
  detail: 'aggregate'
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
  const state = specState(viewSpec) as unknown as Record<string, unknown>;
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
  if (stateKey === 'selection' && typeof operationSpec?.['mode'] === 'string') {
    return operationSpec['mode'];
  }
  return operations[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}

function pruneCompiledViewSpec(spec: ViewSpec): ViewSpec {
  const next = { ...spec } as ViewSpec & Record<string, unknown>;
  if (Array.isArray(next['transform']) && !(next['transform'] as unknown[]).length) delete next['transform'];
  if (next['encoding'] && !Object.keys(next['encoding'] as object).length) delete next['encoding'];
  return next;
}

function pruneConsumedSceneState(spec: ViewSpec): ViewSpec {
  const next = cloneViewSpec(spec) as ViewSpec & { meta?: Record<string, unknown> };
  const state = next.meta?.['state'] as Record<string, unknown> | undefined;
  if (!state) return next;

  delete state['selection'];
  delete state['axis'];
  delete state['detail'];
  if (!Object.keys(state).length) delete next.meta?.['state'];
  return next;
}
