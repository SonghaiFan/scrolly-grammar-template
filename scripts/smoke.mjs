import { chartModules } from '../dist/charts/manifest.js';
import {
  createChartIdiomRegistry,
  createSpecCompilerRegistry,
  registerChartModules
} from '../dist/charts/index.js';
import * as sourceApi from '../dist/index.js';
import * as distApi from '../dist/visdelta.esm.js';

const publicApi = [
  'availableChartIdioms',
  'bar',
  'delta',
  'defineChartIdiom',
  'diffViewStates',
  'line',
  'point',
  'registerChartIdiom',
  'registerChartModule',
  'transition',
  'unit',
  'visualizationSpec'
];

const registry = createChartIdiomRegistry();
registerChartModules(registry, chartModules, {});
const compilerKeys = Object.keys(createSpecCompilerRegistry(chartModules)).sort();
const expectedIdioms = ['bar', 'line', 'point', 'unit'];

assertSame(Object.keys(sourceApi).sort(), publicApi.sort(), 'source public API');
assertSame(Object.keys(distApi).sort(), publicApi.sort(), 'dist public API');
assertSame(registry.types(), expectedIdioms, 'chart idiom registry');
assertSame(compilerKeys, expectedIdioms, 'spec compiler registry');

const first = sourceApi.bar([{ category: 'A', value: 1, other: 2 }])
  .x('category')
  .y('value')
  .key('category');
const second = first.y('other');
if (!sourceApi.delta(first, second).has('encoding.y')) {
  throw new Error('Core delta smoke check did not detect the y encoding change.');
}

console.log(JSON.stringify({ types: registry.types(), compilerKeys }, null, 2));

function assertSame(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${label} mismatch: expected ${right}, got ${left}`);
}
