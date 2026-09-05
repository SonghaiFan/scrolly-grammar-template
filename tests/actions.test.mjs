import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActionEvent, hasScrollAction } from '../dist/runtime/actions.js';

test('explicit DOM event indexes, including zero, take priority without requiring an ancestor', () => {
  const target = { dataset: {}, closest: () => null, value: '0.4' };
  for (const step of [0, 2]) {
    assert.equal(normalizeActionEvent({ type: 'click', step, currentTarget: target }, {}, { stepCount: 4 }).index, step);
  }
});

test('DOM event data index resolves on the target before the closest step', () => {
  const target = { dataset: { stepIndex: '0' }, closest: () => ({ dataset: { stepIndex: '2' } }) };
  assert.equal(normalizeActionEvent({ type: 'click', target }, {}, { stepCount: 4 }).index, 0);
  delete target.dataset.stepIndex;
  assert.equal(normalizeActionEvent({ type: 'click', target }, {}, { stepCount: 4 }).index, 2);
});

test('plain action inspection does not require a browser DOM', () => {
  assert.equal(hasScrollAction({ action: ['scroll', 'tooltip'] }), true);
  assert.equal(hasScrollAction(['step', 'tooltip']), false);
});
