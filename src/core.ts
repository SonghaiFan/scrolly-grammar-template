import type { DiffResult, ViewSpec } from './types/index.js';
import { cloneState } from './grammar/view-state.js';
import { diffViewStates } from './grammar/diff.js';
import { serializeViewSpec } from './spec-meta.js';

export type Visualization = ViewSpec | { toSpec(): ViewSpec };

/** Resolve an immutable builder or plain spec into a detached view spec. */
export function visualizationSpec(input: Visualization): ViewSpec {
  if (!input || typeof input !== 'object') {
    throw new Error('Expected a visualization instance or view spec.');
  }
  return serializeViewSpec(cloneState(
    typeof input.toSpec === 'function' ? input.toSpec() : input as ViewSpec
  ));
}

/** Compute the declarative difference between two states of the same chart type. */
export function delta(from: Visualization, to: Visualization): DiffResult {
  const source = visualizationSpec(from);
  const target = visualizationSpec(to);
  if (!source.mark || source.mark !== target.mark) {
    throw new Error('delta() requires two states of the same chart type.');
  }
  return diffViewStates(source, target);
}

export { diffViewStates };
export type { DiffResult, ViewSpec } from './types/index.js';
