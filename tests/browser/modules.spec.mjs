import { test, expect } from '@playwright/test';

test('focused bar transition loads no Story runtime or unrelated idioms', async ({ page }) => {
  const modules = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/dist/')) modules.push(url.pathname);
  });
  await page.goto('/examples/transition/');
  await expect(page.locator('#status')).toHaveText('Ready');
  // The lab uses the A/B/C fixture shared by the transition scenarios.
  await expect(page.locator('#chart rect.sl-bar')).toHaveCount(3);
  await page.locator('#progress').fill('0.37');
  await expect(page.locator('#value')).toHaveText('0.37');
  expect(modules).toContain('/dist/charts/bar/plugin.js');
  expect(modules.filter(path => /\/charts\/(line|point|unit)\//.test(path))).toEqual([]);
  expect(modules.filter(path => /\/(scrollylite|story|seq|manifest)\.js$/.test(path))).toEqual([]);
  expect(modules.filter(path => /\/(shell|navigation)\.js$|\/scroll-drivers\//.test(path))).toEqual([]);
});

test('custom idiom compiler runs and an existing pair keeps its renderer after registration changes', async ({ page }) => {
  await page.goto('/examples/transition/');
  const result = await page.evaluate(async () => {
    const { transition } = await import('/dist/transition-entry.js');
    const { defineChartIdiom, registerChartModule } = await import('/dist/plugins.js');
    const { plugin: barPlugin } = await import('/dist/charts/bar/plugin.js');
    const host = document.createElement('div');
    document.body.append(host);
    // Reuse a public plugin renderer through its normal dependency injection.
    const { CHART_RUNTIME_DEPS } = await import('/dist/runtime/chart-deps.js');
    const renderer = barPlugin.createChartIdiom(CHART_RUNTIME_DEPS).renderer;
    let compiled = 0;
    registerChartModule({ plugin: defineChartIdiom({
      key: 'custom-bar',
      renderer,
      prepareSpec: spec => ({ ...spec, mark: 'bar' }),
      createSpecCompiler: () => ({
        base(spec) { compiled++; return { ...spec, encoding: { x: { field: 'id', type: 'nominal' }, y: { field: spec.measure, type: 'quantitative' } } }; },
        operations: {}
      })
    }) });
    const a = { mark: 'custom-bar', key: 'id', measure: 'a', data: [{ id: 'A', a: 2, b: 7 }] };
    const pair = await transition(a, { ...a, measure: 'b' }, { target: host, d3 });
    pair.progress(0.4);
    const before = host.querySelector('rect.sl-bar')?.getAttribute('height');
    registerChartModule({ plugin: defineChartIdiom({ key: 'custom-bar', renderer() { throw new Error('replacement must not run'); } }) });
    pair.progress(0.7).progress(0.4).resize();
    const after = host.querySelector('rect.sl-bar')?.getAttribute('height');
    pair.destroy();
    host.remove();
    return { compiled, before, after };
  });
  expect(result.compiled).toBeGreaterThan(0);
  expect(result.before).not.toBeNull();
  expect(result.after).toBe(result.before);
});

test('importing Story does not overwrite a focused built-in registration', async ({ page }) => {
  await page.goto('/examples/transition/');
  const calls = await page.evaluate(async () => {
    const { registerChartIdiom } = await import('/dist/plugins.js');
    const { plugin } = await import('/dist/charts/bar/plugin.js');
    const { CHART_RUNTIME_DEPS } = await import('/dist/runtime/chart-deps.js');
    const idiom = plugin.createChartIdiom(CHART_RUNTIME_DEPS);
    let calls = 0;
    registerChartIdiom({ ...idiom, renderer(...args) { calls++; return idiom.renderer(...args); } });
    const { bar, transition } = await import('/dist/index.js');
    const host = document.createElement('div');
    document.body.append(host);
    const a = bar([{ key: 'A', value: 2, other: 4 }]).x('key').y('value');
    const pair = await transition(a, a.y('other'), { target: host, d3 });
    pair.destroy(); host.remove();
    return calls;
  });
  expect(calls).toBeGreaterThan(0);
});

test('ESM and browser Story wrappers share the Seq and runtime contracts', async ({ page }) => {
  await page.goto('/examples/transition/');
  const result = await page.evaluate(async () => {
    const esm = await import('/dist/index.js');
    const browser = await import('/dist/browser.js');
    const results = [];
    for (const api of [esm, browser]) {
      const host = document.createElement('div');
      document.body.append(host);
      const a = api.bar([{ key: 'A', value: 2, other: 4 }]).x('key').y('value');
      const sequence = api.seq().add(a, 'First').add(a.y('other'), 'Second');
      const runtime = await api.chart(sequence, { target: host, d3, initialStep: 1 });
      const index = sequence.index;
      runtime.progress(1, 0.5);
      runtime.resize();
      const bars = host.querySelectorAll('rect.sl-bar').length;
      runtime.destroy();
      const shell = await api.page(sequence, { target: host });
      const steps = shell.steps.length;
      shell.destroy();
      host.remove();
      results.push({ index, bars, steps });
    }
    return results;
  });
  expect(result).toEqual([{ index: 1, bars: 1, steps: 2 }, { index: 1, bars: 1, steps: 2 }]);
});

test('initial rendering failure restores the original target and listeners', async ({ page }) => {
  await page.goto('/examples/transition/');
  const result = await page.evaluate(async () => {
    const { bar } = await import('/dist/bar.js');
    const { transition } = await import('/dist/transition-entry.js');
    const host = document.createElement('div');
    const original = document.createElement('button');
    let clicks = 0;
    original.onclick = () => clicks++;
    host.append(original); document.body.append(host);
    const a = bar([{ key: 'A', value: 2 }]).x('key').y('value');
    let error;
    try { await transition(a, a.where({ key: 'A' }), { target: host, d3 }); }
    catch (cause) { error = cause.message; }
    const restored = host.firstChild === original;
    original.click(); host.remove();
    return { error, restored, clicks };
  });
  expect(result.error).toContain('Arquero');
  expect(result.restored).toBe(true);
  expect(result.clicks).toBe(1);
});
