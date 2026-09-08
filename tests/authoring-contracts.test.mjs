import test from 'node:test';
import assert from 'node:assert/strict';
import { bar, line, point, unit, story } from '../dist/index.js';

test('documented Story view forms configure main or an explicitly named view', () => {
  const spec = story().view({ title: 'Main', height: 400 }).view('detail', { height: 240 }).toSpec();
  assert.deepEqual(spec.views, { main: { title: 'Main', height: 400 }, detail: { height: 240 } });
  const seeded = story({ views: { main: { height: 400 }, detail: { height: 240 } } }).toSpec();
  assert.equal(seeded.views.detail.height, 240);
});

test('Story defers compilation until toSpec and uses the final default action', () => {
  let compiled = 0;
  const view = { toSpec() { compiled++; return bar([{ x: 'A', y: 2 }]).x('x').y('y').toSpec(); } };
  const builder = story().add('First', view).add('Second', view).action(['scroll']);
  assert.equal(compiled, 0);
  const spec = builder.toSpec();
  assert.ok(compiled > 0);
  assert.deepEqual(spec.steps[0].action, ['scroll', 'enter']);
  assert.deepEqual(spec.steps[1].action, ['scroll']);
  assert.equal(spec.steps[1].transition, undefined);
});

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
  assert.deepEqual(base.breakdown('type', { color: ['#112233', '#445566'] }).toSpec().encoding.color, {
    field: 'type', type: 'nominal', range: ['#112233', '#445566']
  });
});
