import type { DiffResult, ViewSpec } from './types/index.js';
import { cloneState } from './grammar/view-state.js';
import { diffViewStates } from './grammar/diff.js';
import { serializeViewSpec } from './spec-meta.js';
import type { ChartModule } from './charts/module.js';
import { resolveSpecDataTypes } from './data/types.js';

export type Visualization = ViewSpec | {
  toSpec(): ViewSpec;
  /** Runtime chart implementation carried by a chainable visualization. */
  chartModule?(): ChartModule<any>;
};

/** Read a visualization's chart module without adding it to serialized state. */
export function visualizationChartModule(input: Visualization): ChartModule<any> | null {
  if (!input || typeof input !== 'object' || typeof input.chartModule !== 'function') return null;
  return input.chartModule();
}

/** Resolve an immutable builder or plain spec into a detached view spec. */
export function visualizationSpec(input: Visualization): ViewSpec {
  if (!input || typeof input !== 'object') {
    throw new Error('Expected a visualization instance or view spec.');
  }
  const spec = serializeViewSpec(cloneState(
    typeof input.toSpec === 'function' ? input.toSpec() : input as ViewSpec
  ));
  const data = spec.data as { values?: unknown[] } | unknown[] | undefined;
  const rows = Array.isArray(data) ? data : Array.isArray(data?.values) ? data.values : null;
  return rows ? resolveSpecDataTypes(spec, rows) : spec;
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
export { detectDataTypes, resolveEncodingTypes } from './data/types.js';
export type { ChannelType } from './types/index.js';
export type { DiffResult, ViewSpec } from './types/index.js';
