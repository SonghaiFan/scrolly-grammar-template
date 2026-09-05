import { bar, createChart, chart, render, page, seq } from 'scrollylite';
import { transition } from 'scrollylite/transition';
import { delta } from 'scrollylite/core';
import { bar as focusedBar } from 'scrollylite/bar';
import { defineChartIdiom, registerChartModule } from 'scrollylite/plugins';
import * as browser from 'scrollylite/browser';

declare const d3: Record<string, unknown>;
const a = bar().data([{ key: 'A', value: 1, next: 2 }]).x('key').y('value');
const b = a.y('next');
const pair = await transition(a, b, { target: '#chart', d3 });
pair.progress(0.4).play({ duration: 300 }).pause().resize();
pair.destroy();
delta(a, b).hasDelta('encoding.y');
focusedBar().data([]).x('key');
const runtime = await createChart({}, { d3 });
runtime.to(1);
runtime.progress(1, 0.5);
runtime.resize();
runtime.destroy();
// @ts-expect-error action() is not a public runtime method.
runtime.action({ type: 'click' });
// @ts-expect-error Pair progress accepts only a number.
pair.progress('0.5');
// @ts-expect-error ESM dependencies are explicit.
await transition(a, b, { target: '#chart' });
// @ts-expect-error ESM chart wrapper also requires D3.
await chart({}, { target: '#chart' });
await chart({}, { d3 });
const storyRuntime = await render({}, { d3 });
storyRuntime.scrollDriver.refresh();
storyRuntime.scrollDriver.scrollToStep(1, { behavior: 'smooth', progress: 0.5 });
// @ts-expect-error Driver navigation requires a numeric step index.
storyRuntime.scrollDriver.scrollToStep('1');
await page(seq());
seq().unbind().off('change');
await browser.transition(a, b);
await browser.chart(seq());
await browser.page(seq());
registerChartModule({ plugin: defineChartIdiom({ key: 'custom', renderer() {} }) });
