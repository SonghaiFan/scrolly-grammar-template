import { diffViewStates, pushDelta, pushStateDelta } from '../../grammar/diff.js';
import type { BarSemanticState, Delta, DiffResult, ViewSpec } from '../../types/index.js';
import { semanticBarState } from './semantic.js';

export { semanticBarState };

type PushDeltaFn = <T>(
  deltas: Delta[],
  type: string,
  previous: T | null | undefined,
  next: T | null | undefined
) => void;

interface DiffHelpers {
  pushDelta: PushDeltaFn;
  pushStateDelta: PushDeltaFn;
}

export function appendBarSemanticDeltas(
  deltas: Delta[],
  previous: BarSemanticState,
  next: BarSemanticState,
  { pushDelta, pushStateDelta }: DiffHelpers
): void {
  pushDelta(deltas, 'bar.orientation', previous.orientation, next.orientation);
  pushDelta(deltas, 'bar.layout', previous.layout, next.layout);
  pushDelta(deltas, 'bar.category-field', previous.categoryField, next.categoryField);
  pushDelta(deltas, 'bar.measure-field', previous.measureField, next.measureField);
  pushStateDelta(deltas, 'bar.axis', previous.axis, next.axis);
  pushStateDelta(deltas, 'bar.detail', previous.detail, next.detail);
  pushStateDelta(deltas, 'bar.aggregate', previous.aggregate, next.aggregate);
  pushDelta(deltas, 'bar.segment-field', previous.segmentField, next.segmentField);
  pushDelta(deltas, 'bar.x-geometry', previous.xGeometry, next.xGeometry);
  pushDelta(deltas, 'bar.y-geometry', previous.yGeometry, next.yGeometry);
}

/** Add Bar-only semantic deltas without teaching shared Core about Bar. */
export function diffBarViewStates(previousSpec: ViewSpec, nextSpec: ViewSpec): DiffResult {
  const result = diffViewStates(previousSpec, nextSpec);
  const deltas = [...result.deltas];
  appendBarSemanticDeltas(
    deltas,
    semanticBarState(previousSpec),
    semanticBarState(nextSpec),
    { pushDelta, pushStateDelta }
  );
  const semantic = {
    ...result.semantic,
    deltas,
    has: (type: string, action = null) =>
      deltas.some((delta) => delta.type === type && (action == null || delta.action === action)),
    get: <T = unknown>(type: string) =>
      (deltas.find((delta) => delta.type === type) ?? null) as Delta<T> | null
  };
  return {
    ...result,
    deltas,
    delta: <T = unknown>(type: string) =>
      (deltas.find((delta) => delta.type === type) ?? null) as Delta<T> | null,
    hasDelta: (type: string, action = null) =>
      deltas.some((delta) => delta.type === type && (action == null || delta.action === action)),
    semantic
  };
}
