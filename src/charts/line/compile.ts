import type { SpecCompiler, ViewSpec } from '../../types/index.js';
import {
  aggregateFieldSpec,
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileFocus,
  compileHighlight,
  identitySpec,
  withObject,
  withSceneState
} from '../compiler-utils.js';

type AnyRecord = Record<string, unknown>;

export function createLineSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
  return {
    base: compileLineBase,
    operations: {
      filter: compileFilter,
      focus: compileFocus,
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

  let nextSpec: ViewSpec = { ...spec, encoding: encoding as ViewSpec['encoding'] };
  if (mode === 'single') {
    if (detailSpec['color']) encoding['color'] = detailSpec['color'];
    else delete encoding['color'];

    const x = encoding['x'] as import('../../types/index.js').ChannelSpec | undefined;
    const y = encoding['y'] as import('../../types/index.js').ChannelSpec | undefined;
    if (x?.field && y?.field) {
      const aggregate = aggregateFieldSpec(
        { field: y.field, op: String(detailSpec['op'] ?? 'sum'), as: String(detailSpec['as'] ?? y.field) } as import('../../types/index.js').ChannelSpec,
        y.field,
        String(detailSpec['as'] ?? y.field),
        'sum'
      );
      encoding['y'] = { ...y, field: aggregate.as };
      nextSpec = withObject({
        ...spec,
        transform: [...(spec.transform || []), {
          aggregate: { groupby: [x.field], fields: [aggregate] }
        }],
        encoding: encoding as ViewSpec['encoding']
      }, { key: x.field });
    }
  }

  return withSceneState(
    nextSpec,
    {
      detail: {
        mode,
        seriesField: mode === 'series' ? seriesField : null,
        ...(detailSpec['stage'] ? { stage: detailSpec['stage'] } : {}),
        ...(detailSpec['position'] ? { position: detailSpec['position'] } : {}),
        ...(detailSpec['parentOp'] ? { parentOp: detailSpec['parentOp'] } : {}),
        ...(mode === 'single' ? { op: detailSpec['op'] ?? 'sum' } : {})
      }
    }
  );
}

function compileLineLayout(spec: ViewSpec, _operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return spec;
}
