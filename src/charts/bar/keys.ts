import { keyAccessor, semanticKeyForDatum, semanticMeasureForDatum } from '../../identity/semantic-key.js';
import { specSemanticKey } from '../../spec-meta.js';
import type { ChartContext, DataRow, ViewSpec } from '../../types/index.js';

type KeyFn = (this: Element, d: DataRow, i: number) => string | number;

export function barKeyAccessor(
  chart: ChartContext,
  spec: ViewSpec,
  fallbackField = 'id'
): KeyFn {
  const fallback = keyAccessor(spec, fallbackField) as KeyFn;
  const matchPlan = chart.transitionPlan?.match as
    | { mode?: string }
    | undefined;

  if (matchPlan?.mode !== 'semantic' || !specSemanticKey(spec)) {
    return fallback;
  }

  return function semanticJoinKey(this: Element, d: DataRow, i: number): string | number {
    const el = this as Element & { dataset?: DOMStringMap };
    if (el.dataset?.semanticKey) return el.dataset.semanticKey;
    return (semanticKeyForDatum(d, spec) as string | null) ?? fallback.call(this, d, i);
  };
}

export function applyBarIdentity(
  selection: unknown,
  spec: ViewSpec,
  key: KeyFn,
  categoryValue: (d: DataRow) => unknown
): unknown {
  type D3Selection = { attr(name: string, fn: unknown): D3Selection };
  const s = selection as D3Selection;
  return s
    .attr('data-key', function (this: Element, d: DataRow, i: number) {
      return key.call(this, d, i);
    })
    .attr('data-category', categoryValue)
    .attr('data-measure', (d: DataRow) => semanticMeasureForDatum(d, spec))
    .attr('data-semantic-key', (d: DataRow) => semanticKeyForDatum(d, spec));
}
