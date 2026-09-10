import test from 'node:test';
import assert from 'node:assert/strict';
import { bar, line, point, unit } from '../dist/index.js';

test('documented filtering uses where, not a nonexistent filter method', () => {
  for (const factory of [bar, line, point, unit]) {
    const declaration = factory([{ x: 'A', y: 2 }, { x: 'B', y: 3 }]).x('x').y('y');
    assert.equal(typeof declaration.filter, 'undefined');
    assert.doesNotThrow(() => declaration.where('datum.y >= 2').toSpec());
  }
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
