import test from 'node:test';
import assert from 'node:assert/strict';
import * as d3 from 'd3';
import { cameraScale, fitCamera, focusCamera, pointBounds } from '../dist/core.js';

test('focus camera fits selected visual bounds with one uniform zoom and pan', () => {
  const targets = [
    { datum: { id: 'a', group: 'keep' }, bounds: pointBounds(15, 15, 5) },
    { datum: { id: 'b', group: 'other' }, bounds: pointBounds(85, 85, 5) }
  ];
  const camera = focusCamera(
    targets,
    { mode: 'focus', filter: { field: 'group', equal: 'keep' } },
    { width: 100, height: 100 }
  );

  assert.equal(camera.k, 10);
  assert.equal(camera.x, -100);
  assert.equal(camera.y, -100);
  assert.deepEqual(camera.bounds, { x0: 10, y0: 10, x1: 20, y1: 20 });
});

test('camera scale keeps a band domain and transforms its complete range', () => {
  const scale = d3.scaleBand().domain(['a', 'b', 'c']).range([0, 120]).padding(0.2);
  const camera = fitCamera({ x0: 40, y0: 0, x1: 80, y1: 100 }, { width: 120, height: 100 });
  const moved = cameraScale(scale, camera, 'x');

  assert.deepEqual(moved.domain(), ['a', 'b', 'c']);
  assert.deepEqual(moved.range(), scale.range().map((value) => camera.x + camera.k * value));
});

test('camera scale derives a continuous visible domain from the same transform', () => {
  const scale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
  const camera = { k: 2, x: -100, y: 0, bounds: null };
  const moved = cameraScale(scale, camera, 'x');

  assert.deepEqual(moved.range(), [0, 500]);
  assert.deepEqual(moved.domain(), [10, 60]);
  assert.equal(moved(25), camera.x + camera.k * scale(25));
  const d3Reference = d3.zoomIdentity
    .translate(camera.x, camera.y)
    .scale(camera.k)
    .rescaleX(scale);
  assert.deepEqual(moved.domain(), d3Reference.domain());
});
