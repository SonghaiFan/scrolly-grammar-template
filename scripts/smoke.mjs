import { chartModules } from '../dist/charts/manifest.js';
import {
  createChartTypeRegistry,
  createSpecCompilerRegistry,
  registerChartModules
} from '../dist/charts/index.js';
import * as sourceApi from '../dist/index.js';
import * as distApi from '../dist/visdelta.esm.js';

const publicApi = [
  'availableChartTypes',
  'bar',
  'delta',
  'defineChartType',
  'diffViewStates',
  'line',
  'point',
  'registerChartType',
  'registerChartModule',
  'transition',
  'unit',
  'visualizationSpec'
];

const registry = createChartTypeRegistry();
registerChartModules(registry, chartModules, {});
const compilerKeys = Object.keys(createSpecCompilerRegistry(chartModules)).sort();
const expectedTypes = ['bar', 'line', 'point', 'unit'];

assertSame(Object.keys(sourceApi).sort(), publicApi.sort(), 'source public API');
assertSame(Object.keys(distApi).sort(), publicApi.sort(), 'dist public API');
assertSame(registry.types(), expectedTypes, 'chart type registry');
assertSame(compilerKeys, expectedTypes, 'spec compiler registry');

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
