import test from 'node:test';
import assert from 'node:assert/strict';
import { bar, D3_CURVE_NAMES, line, point, unit } from '../dist/index.js';
import { connectedLineSeries, lineRowsAtTotal } from '../dist/charts/line/state.js';
import { pointIntermediateSpecs } from '../dist/charts/point/state.js';

test('documented filtering uses where, not a nonexistent filter method', () => {
  for (const factory of [bar, line, point, unit]) {
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

  const adjacent = connectedLineSeries(rows, lineage, null, key, selection, 'adjacent');
  assert.deepEqual(adjacent.map(series => series.rows.map(row => row.id)), [
    ['Q1', 'Q2'],
    ['Q5', 'Q6']
  ]);
  assert.deepEqual(
    connectedLineSeries(rows, lineage, null, key, selection, 'across')[0].rows.map(row => row.id),
    ['Q1', 'Q2', 'Q5', 'Q6']
  );
});
