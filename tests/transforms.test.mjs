import test from 'node:test';
import assert from 'node:assert/strict';
import * as aq from 'arquero';
import { applyTransforms } from '../dist/data/transforms.js';
import { bar, line, point, unit } from '../dist/index.js';

const rows = [{ id: 'A', value: 0 }, { id: 'B', value: 2 }, { id: 'C', value: 4 }];
const run = (transforms, source = rows) => applyTransforms(source, transforms, aq);

test('zero limit is empty; transforms run in declared order without mutating input', () => {
  assert.deepEqual(run([{ limit: 0 }]), []);
  assert.deepEqual(run([{ sort: { field: 'value', order: 'descending' } }, { limit: 1 }]), [rows[2]]);
  assert.deepEqual(run([{ limit: 1 }, { sort: { field: 'value', order: 'descending' } }]), [rows[0]]);
  assert.equal(rows[0].id, 'A');
});

test('every supported aggregate operator has an explicit result', () => {
  for (const [op, expected] of [['count', 3], ['sum', 6], ['mean', 2], ['min', 0], ['max', 4], ['median', 2]]) {
    assert.deepEqual(run([{ aggregate: { fields: [{ op, field: 'value', as: 'result' }] } }]), [{ result: expected }]);
  }
});

test('constant, empty and nonnumeric bins do not divide by zero or emit NaN labels', () => {
  const transform = [{ bin: { field: 'value' } }];
  assert.deepEqual(run(transform, []), []);
  const binned = run(transform, [{ value: 5 }, { value: 5 }, { value: null }, { value: 'invalid' }]);
  assert.deepEqual(binned.map(row => row.value_bin), ['5-6', '5-6', null, null]);
  assert.equal(binned[0].value_bin_start, 5);
  assert.equal(binned[0].value_bin_end, 6);
  assert.equal(binned[2].value_bin_start, null);
});

test('filters use conjunction and exclude missing numeric values', () => {
  assert.deepEqual(run([{ filter: { field: 'value', oneOf: [0, 2, 4], gt: 0, lt: 4 } }]), [rows[1]]);
  assert.deepEqual(run([{ filter: { field: 'value', gte: 0 } }], [{}, { value: NaN }, { value: null }, { value: false }, { value: 0 }]), [{ value: 0 }]);
  assert.deepEqual(run([{ filter: 'datum.value >= 2' }]), rows.slice(1));
  assert.deepEqual(run([{ filter: 'datum.id === "B"' }]), [rows[1]]);
  assert.deepEqual(run([{ filter: 'datum.active === true' }], [{ active: true }, { active: false }]), [{ active: true }]);
});

test('string selectors compile to real filters on all built-in idioms', () => {
  for (const factory of [bar, line, point, unit]) {
    const view = factory(rows).x('id').y('value').where('datum.value >= 2');
    const spec = view.toSpec();
    // Line keeps full data and crops its domain; its selector is scene state.
    const transforms = spec.transform ?? [{ filter: spec.narrative.state.sceneState.focus.filter }];
    assert.deepEqual(run(transforms), rows.slice(1));
    assert.throws(() => factory(rows).where('datum.value + 1'), /filter expression/);
    assert.throws(() => factory(rows).where({ field: 'value', equals: 2 }), /Unsupported filter/);
  }
});

test('malformed transforms reject even when the input is empty', () => {
  const invalid = [null, {}, { unknown: {} }, { limit: -1 }, { limit: 0.5 },
    { sort: { field: 'id', order: 'up' } }, { bin: { field: 'value', step: 0 } },
    { bin: { field: 'value', maxbins: 0 } }, { bin: { field: 'value', maxBins: 4 } },
    { aggregate: { fields: [{ op: 'average', field: 'value' }] } },
    { timeUnit: { field: 'date', unit: 'year' } }, { fold: { fields: [] } },
    { filter: { field: 'value', equals: 2 } }, { filter: 'datum.value === 2 || true' },
    { filter: 'datum.id == B' }, { filter: { field: 'id' } }, { filter: { field: 'id', oneOf: 'B' } },
    { limit: 1, sort: { field: 'id' } }];
  for (const transform of invalid) assert.throws(() => run([transform], []), /transform\[0\]/, JSON.stringify(transform));
  assert.throws(() => run(null), /must be an array/);
});
