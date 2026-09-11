import test from 'node:test';
import assert from 'node:assert/strict';
import { area, bar, D3_AREA_CURVE_NAMES, D3_CURVE_NAMES, line, point, unit, UNIT_LAYOUTS } from '../dist/index.js';
import { areaCells, areaLayers } from '../dist/charts/area/state.js';
import { matchAreaFramePoints } from '../dist/charts/area/render.js';
import { connectedLineStretches, lineRowsAtTotal } from '../dist/charts/line/state.js';
import { pointIntermediateSpecs } from '../dist/charts/point/state.js';
import { expandUnits, minimumTravelMatching } from '../dist/charts/unit/state.js';

test('documented filtering uses where, not a nonexistent filter method', () => {
  for (const factory of [area, bar, line, point, unit]) {
    const declaration = factory([{ x: 'A', y: 2 }, { x: 'B', y: 3 }]).x('x').y('y');
    assert.equal(typeof declaration.filter, 'undefined');
    assert.doesNotThrow(() => declaration.where('datum.y >= 2').toSpec());
  }
});

test('where changes rows while focus keeps rows and changes the view', () => {
  const rows = [
    { id: 'A', category: 'A', x: 10, y: 20, region: 'North' },
    { id: 'B', category: 'B', x: 30, y: 40, region: 'South' }
  ];
  const charts = [
    area(rows).x('category').y('y').key('id'),
    bar(rows).x('category').y('y').key('id'),
    point(rows).x('x').y('y').key('id'),
    line(rows).x('x', { type: 'quantitative' }).y('y').key('id')
  ];

  for (const chart of charts) {
    const filtered = chart.where({ region: 'North' }).toSpec();
    const focused = chart.focus({ region: 'North' }).toSpec();
    assert.ok(filtered.transform?.some(transform => transform.filter));
    assert.equal(focused.transform?.some(transform => transform.filter) ?? false, false);
    assert.equal(focused.meta.state.sceneState.selection.mode, 'focus');
  }

  const filteredBar = charts[0].where({ type: 'Hot days' }).toSpec();
  assert.equal(filteredBar.meta.object.key, 'id');
  assert.equal(filteredBar.encoding.y.title, 'Y');
});

test('unit separates group meaning from layout and preserves count identity', () => {
  const rows = [
    { id: 'A', category: 'one', count: 0 },
    { id: 'B', category: 'two', count: 3 }
  ];
  const base = unit(rows).value('count', { maxUnits: 20 }).key('id');
  const grouped = base.group('category');
  const bars = grouped.layout('bar', { columns: 2, radius: 5 });
  const groupedSpec = grouped.toSpec();
  const barSpec = bars.toSpec();

  assert.deepEqual(UNIT_LAYOUTS, ['grid', 'bar', 'timeline', 'dodge']);
  assert.equal(groupedSpec.meta.state.sceneState.axis.group, 'category');
  assert.equal(groupedSpec.meta.state.sceneState.axis.layout, 'grid');
  assert.equal(groupedSpec.encoding?.color, undefined);
  assert.equal(barSpec.meta.state.sceneState.axis.layout, 'bar');
  assert.equal(barSpec.meta.unit.columns, 2);
  assert.equal(barSpec.meta.unit.radius, 5);
  assert.equal(typeof bars.rollup, 'undefined');
  assert.equal(typeof bars.breakdown, 'undefined');

  const units = expandUnits(barSpec.data, barSpec, {});
  assert.equal(units.length, 3);
  assert.deepEqual(units.map(value => value.__unitKey), ['B\u00000', 'B\u00001', 'B\u00002']);
  assert.throws(() => base.layout('cluster'), /grid, bar, timeline, dodge/);
  assert.throws(() => base.columns(0), /positive integer/);
  assert.throws(() => base.radius(0), /positive finite/);
  assert.throws(() => base.value('count', { maxUnits: 0 }), /positive integer/);
});

test('unit matching fills each target slot with the closest available unit globally', () => {
  const sources = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 10 },
    { x: 10, y: 10 }
  ];
  const targets = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 }
  ];
  const matches = minimumTravelMatching(sources, targets);

  assert.deepEqual(matches.map(({ sourceIndex, targetIndex }) => [sourceIndex, targetIndex]), [
    [0, 0],
    [1, 1],
    [3, 2]
  ]);
  assert.equal(matches.reduce((sum, match) => sum + match.distance, 0), 0);
});

test('area owns explicit baseline and diverging stacked boundaries', () => {
  const rows = [
    { period: 'Q1', region: 'North', value: 12 },
    { period: 'Q1', region: 'South', value: -4 },
    { period: 'Q2', region: 'North', value: 8 },
    { period: 'Q2', region: 'South', value: 5 }
  ];
  const detailed = area(rows).x('period').y('value').key(['period', 'region'])
    .baseline(10).breakdown('region', { color: ['#111111', '#eeeeee'] });
  assert.equal(
    area(rows).x('period').y('value').breakdown('region').toSpec().encoding.color,
    undefined
  );
  const spec = detailed.toSpec();
  assert.equal(spec.baseline, 10);
  assert.equal(spec.meta.state.sceneState.detail.mode, 'stacked');
  assert.deepEqual(spec.encoding.color.range, ['#111111', '#eeeeee']);

  const layers = areaLayers(rows, 'period', 'value', {
    selection: null, mode: 'stacked', seriesField: 'region', baseline: 10
  });
  assert.deepEqual(layers[0].points.map(point => [point.y0, point.y1]), [[10, 22], [10, 18]]);
  assert.deepEqual(layers[1].points.map(point => [point.y0, point.y1]), [[10, 6], [18, 23]]);

  const total = detailed.rollup().toSpec();
  assert.deepEqual(total.transform.at(-1), {
    aggregate: {
      groupby: ['period'],
      fields: [{ op: 'sum', field: 'value', as: 'value' }]
    }
  });
  assert.equal(total.encoding.color, undefined);
  assert.throws(() => detailed.baseline(Number.NaN), /finite number/);
  assert.equal(detailed.connect('adjacent').toSpec().connect, 'adjacent');
  assert.equal(detailed.connect('across').toSpec().connect, 'across');
  assert.throws(() => detailed.connect('sometimes'), /adjacent.*across/);
  assert.equal(D3_AREA_CURVE_NAMES.length, 19);
  for (const curve of D3_AREA_CURVE_NAMES) {
    assert.equal(area(rows).x('period').y('value').curve(curve).toSpec().curve, curve);
  }
  assert.throws(() => detailed.curve('curveBundle'), /supports areas/);
  assert.throws(() => detailed.curve('smooth'), /supports areas/);
});

test('area filters keep separate connected stretches unless the author connects across', () => {
  const lineage = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']
    .map((id, index) => ({ id, period: id, value: index + 1 }));
  const rows = lineage.filter(row => !['Q3', 'Q4'].includes(row.id));
  const selection = { filter: { field: 'id', oneOf: rows.map(row => row.id) } };
  const state = {
    selection, mode: 'single', seriesField: null, baseline: 0, connect: 'adjacent'
  };
  const key = row => row.id;
  const layers = areaLayers(rows, 'period', 'value', state, key);
  const lineageLayers = areaLayers(lineage, 'period', 'value', state, key);
  const adjacent = areaCells(layers, lineageLayers);
  const cell = (cells, key) => cells.find(value => value.observationKey === key);
  assert.deepEqual(adjacent.map(value => value.observationKey), ['Q1', 'Q2', 'Q5', 'Q6']);
  assert.equal(cell(adjacent, 'Q1').left, null);
  assert.equal(cell(adjacent, 'Q1').right.key, 'Q2');
  assert.equal(cell(adjacent, 'Q2').left.key, 'Q1');
  assert.equal(cell(adjacent, 'Q2').right, null);
  assert.equal(cell(adjacent, 'Q5').left, null);
  assert.equal(cell(adjacent, 'Q5').right.key, 'Q6');
  assert.equal(cell(adjacent, 'Q6').left.key, 'Q5');
  assert.equal(cell(adjacent, 'Q6').right, null);

  const across = areaCells(layers, layers);
  assert.equal(cell(across, 'Q2').right.key, 'Q5');
  assert.equal(cell(across, 'Q5').left.key, 'Q2');

  const isolatedLayers = areaLayers([lineage[2]], 'period', 'value', state, key);
  assert.deepEqual(areaCells(isolatedLayers, lineageLayers), []);
});

test('area observations enter and exit at zero thickness without moving x', () => {
  const fewer = [
    { key: 'Q1', x: 10, y0: 100, y1: 70 },
    { key: 'Q3', x: 30, y0: 100, y1: 40 }
  ];
  const more = [
    { key: 'Q1', x: 10, y0: 100, y1: 70 },
    { key: 'Q2', x: 20, y0: 100, y1: 55 },
    { key: 'Q3', x: 30, y0: 100, y1: 40 }
  ];
  const enter = matchAreaFramePoints(fewer, more).find(pair => pair.key === 'Q2');
  assert.deepEqual(enter.from, { x: 20, y0: 100, y1: 100 });
  assert.equal(enter.to.x, 20);
  assert.equal(enter.to.y1, 55);

  const exit = matchAreaFramePoints(more, fewer).find(pair => pair.key === 'Q2');
  assert.equal(exit.from.x, 20);
  assert.deepEqual(exit.to, { x: 20, y0: 100, y1: 100 });
});

test('color is an explicit encoding, including for bar breakdowns', () => {
  const rows = [
    { category: 'A', type: 'one', value: 10 },
    { category: 'A', type: 'two', value: 20 }
  ];
  const base = bar(rows).x('category').y('value').key('category');
  assert.equal(base.toSpec().encoding.color, undefined);
  assert.equal(base.breakdown('type').toSpec().encoding.color, undefined);
  assert.deepEqual(base.breakdown('type').color('type').toSpec().encoding.color, {
    field: 'type', type: 'nominal'
  });
  assert.equal(base.breakdown('type').color('type').rollup().toSpec().encoding.color, undefined);
});

test('order is the canonical authored transition-step order', () => {
  const base = bar([{ category: 'A', value: 1 }]).x('category').y('value');
  const ordered = base.flip({ order: ['x', 'y'], duration: 300 }).toSpec();

  assert.deepEqual(ordered.meta.state.sceneState.axis.order, ['x', 'y']);
  assert.equal(ordered.meta.state.sceneState.axis.duration, 300);
});

test('point size and summary parent fields survive compilation', () => {
  const rows = [
    { id: 'A', region: 'North', x: 10, y: 20 },
    { id: 'B', region: 'North', x: 20, y: 30 }
  ];
  const detailed = point(rows).x('x').y('y').key('id').pointSize(11).color('region');
  assert.equal(detailed.toSpec().size, 11);
  assert.throws(() => detailed.radius(0), /positive finite number/);

  const summary = detailed.rollup('region');
  assert.deepEqual(summary.toSpec().meta.state.sceneState.detail.groupby, ['region']);
  assert.equal(
    summary.breakdown('id').toSpec().meta.state.sceneState.detail.parentField,
    'region'
  );
});

test('point detail first sets the target view while keeping summary marks', () => {
  const rows = [
    { id: 'A', region: 'North', x: 10, y: 20 },
    { id: 'B', region: 'North', x: 20, y: 30 },
    { id: 'C', region: 'South', x: 70, y: 80 }
  ];
  const detail = point(rows).x('x').y('y').key('id').color('region').toSpec();
  const summary = point(rows).x('x').y('y').key('id').color('region')
    .rollup('region').toSpec();
  const phases = pointIntermediateSpecs(summary, detail);

  assert.equal(phases.length, 1);
  assert.deepEqual(phases[0].spec.transform, summary.transform);
  assert.equal(phases[0].spec.meta.state.sceneState.detail.mode, 'aggregate');
  assert.equal(phases[0].spec.meta.state.sceneState.detail.step, 'set-view');
  assert.deepEqual(phases[0].spec.meta.state.sceneState.detail.view.encoding, detail.encoding);
  assert.deepEqual(phases[0].spec.meta.state.sceneState.detail.view.transform, detail.transform || []);
});

test('line rollup aggregates by x and line styling uses D3 curve names', () => {
  const rows = [
    { period: 'Q1', region: 'North', value: 12 },
    { period: 'Q1', region: 'South', value: 8 }
  ];
  const detailed = line(rows).x('period').y('value').key(['period', 'region'])
    .breakdown('region', { color: ['#111111', '#eeeeee'] });
  const total = detailed.rollup({ op: 'sum' }).toSpec();

  assert.deepEqual(total.transform.at(-1), {
    aggregate: {
      groupby: ['period'],
      fields: [{ op: 'sum', field: 'value', as: 'value' }]
    }
  });
  assert.equal(total.encoding.color, undefined);
  assert.equal(total.meta.state.sceneState.detail.mode, 'single');
  assert.equal(D3_CURVE_NAMES.length, 20);
  for (const curve of D3_CURVE_NAMES) {
    assert.equal(line(rows).x('period').y('value').curve(curve).toSpec().curve, curve);
  }
  assert.throws(() => detailed.curve('smooth'), /D3 curve name/);
  assert.throws(() => detailed.strokeWidth(0), /positive finite number/);
  assert.throws(() => detailed.pointSize(-1), /nonnegative finite number/);
  assert.equal(detailed.connect('adjacent').toSpec().connect, 'adjacent');
  assert.equal(detailed.connect('across').toSpec().connect, 'across');
  assert.throws(() => detailed.connect('sometimes'), /adjacent.*across/);
  assert.deepEqual(
    lineRowsAtTotal(rows, 'period', 'value', 'mean').map(row => row.value),
    [10, 10]
  );
});

test('line filters keep gaps unless the author connects across them', () => {
  const lineage = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map((id, index) => ({ id, value: index }));
  const rows = lineage.filter(row => !['Q3', 'Q4'].includes(row.id));
  const selection = { filter: { field: 'id', oneOf: rows.map(row => row.id) } };
  const key = row => row.id;

  const adjacent = connectedLineStretches(rows, lineage, null, key, selection, 'adjacent');
  assert.deepEqual(adjacent.map(series => series.rows.map(row => row.id)), [
    ['Q1', 'Q2'],
    ['Q5', 'Q6']
  ]);
  assert.deepEqual(
    connectedLineStretches(rows, lineage, null, key, selection, 'across')[0].rows.map(row => row.id),
    ['Q1', 'Q2', 'Q5', 'Q6']
  );
  assert.deepEqual(
    connectedLineStretches([lineage[2]], lineage, null, key, selection, 'adjacent'),
    []
  );
});
