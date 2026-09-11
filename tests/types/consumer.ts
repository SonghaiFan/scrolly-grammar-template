import { bar, delta } from 'visdelta';
import { transition } from 'visdelta/transition';
import { delta as selectedDelta } from 'visdelta/core';
import { bar as selectedBar, barModule } from 'visdelta/bar';
import { point as selectedPoint, pointModule } from 'visdelta/point';
import { line as selectedLine, lineModule } from 'visdelta/line';
import {
  ChartState,
  defineChartModule,
  defineChartType,
  registerChartModule
} from 'visdelta/plugins';
import * as browser from 'visdelta/browser';

declare const d3: Record<string, unknown>;
const a = bar().data([{ key: 'A', value: 1, next: 2 }]).x('key').y('value');
const b = a.y('next');
const pair = await transition(a, b, { target: '#chart', d3 });
pair.progress(0.4).play({ duration: 300 }).pause().resize();
pair.destroy();
delta(a, b).hasDelta('encoding.y');
selectedDelta(a, b).hasDelta('encoding.y');
selectedBar().data([]).x('key');
selectedPoint().data([]).x('x').y('y').radius(6);
selectedLine().data([]).x('x').y('y').curve('curveMonotoneX').strokeWidth(3).pointSize(4);
// @ts-expect-error VisDelta uses exact D3 curve names rather than aliases.
selectedLine().curve('smooth');
registerChartModule(barModule);
registerChartModule(pointModule);
registerChartModule(lineModule);
// @ts-expect-error Pair progress accepts only a number.
pair.progress('0.5');
// @ts-expect-error ESM dependencies are explicit.
await transition(a, b, { target: '#chart' });
await browser.transition(a, b);
const customPlugin = defineChartType({ key: 'custom', renderer() {} });
registerChartModule({ plugin: customPlugin });
const customLazyPlugin = defineChartType({ key: 'custom-lazy', renderer() {} });
const customModule = defineChartModule({
  key: 'custom-lazy',
  async load() { return { plugin: customLazyPlugin }; }
});
registerChartModule(customModule);
class CustomState extends ChartState {
  chartModule() { return customModule; }
}
new CustomState({ mark: 'custom-lazy', data: { values: [] }, encoding: {} }).x('value');
