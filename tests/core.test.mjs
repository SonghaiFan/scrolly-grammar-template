import test from 'node:test';
import assert from 'node:assert/strict';
import { bar } from '../dist/bar.js';
import { delta, visualizationSpec } from '../dist/core.js';

test('focused core computes a delta from immutable visualizations', () => {
  const first = bar([{ category: 'A', value: 1, other: 2 }])
    .x('category')
    .y('value');
  const second = first.y('other');
  const change = delta(first, second);

  assert.equal(change.has('encoding.y'), true);
  assert.equal(change.hasDelta('encoding.y'), true);
  assert.equal(visualizationSpec(first).encoding.y.field, 'value');
  assert.equal(visualizationSpec(second).encoding.y.field, 'other');
});

test('delta rejects cross-idiom endpoints', async () => {
  const barSpec = { mark: 'bar', data: [], encoding: {} };
  const lineSpec = { mark: 'line', data: [], encoding: {} };
  assert.throws(() => delta(barSpec, lineSpec), /same chart idiom/);
});
