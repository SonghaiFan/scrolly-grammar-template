import type { SelectionSpec, SpecCompiler, ViewSpec } from '../../types/index.js';
import {
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileHighlight,
  identitySpec,
  selectorToFilter,
  withSceneState
} from '../compiler-utils.js';

type AnyRecord = Record<string, unknown>;

export function createLineSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
  return {
    base: compileLineBase,
    operations: {
      filter: compileLineFilter,
      highlight: compileHighlight,
      coordinate: compileLineCoordinate,
      scale: compileLineScale,
      aggregate: compileLineAggregate,
      layout: compileLineLayout,
      series: compileLineSeries
    }
  };
}

function compileLineBase(spec: ViewSpec, _context: AnyRecord = {}): ViewSpec {
  return identitySpec(spec);
}

function compileLineFilter(spec: ViewSpec, selectionSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const filter = (selectionSpec['filter'] as SelectionSpec | undefined) || selectorToFilter(selectionSpec);
  if (!filter) return spec;

  if (selectionSpec['mode'] === 'filter' || selectionSpec['mode'] === 'highlight') {
    return selectionSpec['mode'] === 'highlight'
      ? compileHighlight(spec, selectionSpec as SelectionSpec)
      : compileFilter(spec, selectionSpec as SelectionSpec);
  }

  return withSceneState({ ...spec }, {
    selection: {
      filter,
      mode: (selectionSpec['mode'] as string) || 'rangeCrop',
      crop: selectionSpec['crop'] !== false
    }
  });
}

function compileLineCoordinate(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianCoordinate(spec, operationSpec);
}

function compileLineScale(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianScale(spec, operationSpec);
}

function compileLineAggregate(spec: ViewSpec, detailSpec: AnyRecord = {}, context: AnyRecord = {}): ViewSpec {
  return compileLineSeries(spec, detailSpec, context);
}

function compileLineSeries(spec: ViewSpec, detailSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const mode = (detailSpec['mode'] as string) || 'series';
  const encoding = { ...(spec.encoding || {}) } as Record<string, unknown>;
  const seriesField =
    (detailSpec['series'] as string) ||
    (detailSpec['field'] as string) ||
    (encoding['color'] as AnyRecord | undefined)?.['field'] as string | undefined;

  if (mode === 'series' && seriesField) {
    encoding['color'] = detailSpec['color'] || {
      field: seriesField,
      type: 'nominal',
      range: (detailSpec['range'] as string[]) || [
        'var(--sl-series-1)',
        'var(--sl-series-2)',
        'var(--sl-series-3)'
      ]
    };
  }

  if (mode === 'single' && detailSpec['color']) {
    encoding['color'] = detailSpec['color'];
  }

  return withSceneState(
    { ...spec, encoding: encoding as ViewSpec['encoding'] },
    {
      detail: {
        mode,
        seriesField: mode === 'series' ? seriesField : null
      }
    }
  );
}

function compileLineLayout(spec: ViewSpec, _operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return spec;
}
