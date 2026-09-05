import test from 'node:test';
import assert from 'node:assert/strict';
import { seq, bar } from '../dist/index.js';

test('empty and invalid Seq navigation fails without corrupting its cursor', () => {
  const sequence = seq();
  for (const operation of [() => sequence.next(), () => sequence.prev(), () => sequence.at(0), () => sequence.goto(1)]) {
    assert.throws(operation, /empty Seq/);
    assert.equal(sequence.index, -1);
    assert.equal(sequence.current, null);
  }
  sequence.syncCursor(0);
  assert.equal(sequence.current, null);
  sequence.add(bar([]).x('x').y('y'));
  for (const index of [NaN, Infinity, 0.5, '0']) {
    assert.throws(() => sequence.goto(index), /finite integer/);
    assert.equal(sequence.index, -1);
  }
  assert.equal(sequence.goto(99).index, 0);
});

test('Seq snapshots inputs and inspection results', () => {
  const raw = { mark: 'bar', data: [{ x: 'A', y: 1 }], encoding: { x: { field: 'x' }, y: { field: 'y' } } };
  const sequence = seq().add(raw);
  raw.encoding.y.field = 'changed';
  raw.data[0].y = 99;
  const first = sequence.at(0);
  assert.equal(first.spec.encoding.y.field, 'y');
  assert.equal(first.spec.data[0].y, 1);
  first.spec.data[0].y = 50;
  assert.equal(sequence.at(0).spec.data[0].y, 1);
});

test('Seq releases chart/text bindings and change handlers without owning charts', () => {
  let calls = 0;
  let changes = 0;
  const text = { innerHTML: '' };
  const sequence = seq().add(bar([]), 'first').add(bar([]), 'second');
  sequence.bind({ chart: { to() { calls++; }, destroy() { throw new Error('not owned'); } }, text })
    .on('change', () => changes++);
  sequence.next();
  assert.equal(calls, 1);
  assert.equal(changes, 1);
  assert.equal(text.innerHTML, 'first');
  sequence.unbind().off('change').next();
  assert.equal(sequence.index, 1);
  assert.equal(calls, 1);
  assert.equal(changes, 1);
  assert.equal(text.innerHTML, 'first');
});
