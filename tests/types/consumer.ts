import { bar, delta } from 'visdelta';
import { transition } from 'visdelta/transition';
import { delta as focusedDelta } from 'visdelta/core';
import { bar as focusedBar } from 'visdelta/bar';
import { defineChartIdiom, registerChartModule } from 'visdelta/plugins';
import * as browser from 'visdelta/browser';

declare const d3: Record<string, unknown>;
const a = bar().data([{ key: 'A', value: 1, next: 2 }]).x('key').y('value');
const b = a.y('next');
const pair = await transition(a, b, { target: '#chart', d3 });
pair.progress(0.4).play({ duration: 300 }).pause().resize();
pair.destroy();
delta(a, b).hasDelta('encoding.y');
focusedDelta(a, b).hasDelta('encoding.y');
focusedBar().data([]).x('key');
// @ts-expect-error Pair progress accepts only a number.
pair.progress('0.5');
// @ts-expect-error ESM dependencies are explicit.
await transition(a, b, { target: '#chart' });
await browser.transition(a, b);
registerChartModule({ plugin: defineChartIdiom({ key: 'custom', renderer() {} }) });
