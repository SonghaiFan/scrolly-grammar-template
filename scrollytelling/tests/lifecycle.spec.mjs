import { test, expect } from '@playwright/test';

test('native driver is idle between events, coalesces refreshes, and stops after destruction', async ({ page }) => {
  await page.route('**/driver-test', route => route.fulfill({ contentType: 'text/html', body: '<body style="margin:0"><section style="height:600px"></section><section style="height:600px"></section><section style="height:600px"></section><footer style="height:900px"></footer></body>' }));
  await page.goto('/driver-test');
  await page.evaluate(async () => {
    const { createNativeScrollDriver } = await import('/scrollytelling/dist/scroll-drivers/native.js');
    window.stats = { raf: 0, interval: 0, reads: 0, progress: 0, last: null };
    const raf = window.requestAnimationFrame.bind(window);
    const interval = window.setInterval.bind(window);
    window.requestAnimationFrame = fn => { stats.raf++; return raf(fn); };
    window.setInterval = (...args) => { stats.interval++; return interval(...args); };
    const steps = [...document.querySelectorAll('section')];
    steps.forEach(step => {
      const read = step.getBoundingClientRect.bind(step);
      step.getBoundingClientRect = () => { stats.reads++; return read(); };
    });
    window.driver = createNativeScrollDriver({ steps, onProgress: state => { stats.progress++; stats.last = { index: state.index, progress: state.progress }; } });
  });
  await expect.poll(() => page.evaluate(() => stats.progress)).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  const idle = await page.evaluate(() => ({ ...stats }));
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => ({ ...stats }))).toEqual(idle);
  expect(idle.interval).toBe(0);
  const burst = await page.evaluate(() => {
    const before = stats.raf;
    for (let i = 0; i < 100; i++) driver.refresh();
    return stats.raf - before;
  });
  expect(burst).toBe(1);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => stats.last.index)).toBe(1);
  await page.mouse.wheel(0, -500);
  await expect.poll(() => page.evaluate(() => stats.last.progress)).toBe(0);
  const resized = await page.evaluate(() => { const before = stats.progress; document.querySelector('section').style.height = '800px'; return before; });
  await expect.poll(() => page.evaluate(() => stats.progress)).toBeGreaterThan(resized);
  const stopped = await page.evaluate(() => { driver.destroy(); driver.destroy(); return { ...stats }; });
  await page.evaluate(() => {
    driver.refresh(); driver.resize(); driver.scrollToStep(2);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    document.querySelector('section').style.height = '900px';
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => ({ ...stats }))).toEqual(stopped);
});

test('Story destroy removes navigation/hash callbacks and freezes its SVG', async ({ page }) => {
  await page.goto('/scrollytelling/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const { bar } = await import('/dist/index.js');
    const { story, createStory } = await import('/scrollytelling/dist/index.js');
    const host = document.createElement('div'); document.body.append(host);
    const a = bar([{ category: 'A', value: 1, other: 3 }]).x('category').y('value');
    const spec = story().add('First', a).add('Second', a.y('other')).toSpec();
    history.replaceState(null, '', '#step-2');
    const runtime = await createStory(spec, { target: host, d3 });
    // Schedule navigation, resize, and a hash callback, then dispose before their next frame.
    const button = host.querySelectorAll('.sl-nav button')[1];
    button.click(); window.dispatchEvent(new Event('resize'));
    runtime.destroy(); runtime.destroy();
    const before = host.querySelector('svg').outerHTML;
    button.click(); window.dispatchEvent(new Event('resize'));
    let rejected = false;
    try { runtime.to(0); } catch { rejected = true; }
    await new Promise(resolve => setTimeout(resolve, 200));
    const after = host.querySelector('svg').outerHTML;
    host.remove(); history.replaceState(null, '', location.pathname);
    return { before, after, rejected };
  });
  expect(result.after).toBe(result.before);
  expect(result.rejected).toBe(true);
});

test('simultaneous transitions have distinct clipping resources', async ({ page }) => {
  await page.goto('/scrollytelling/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const { bar } = await import('/dist/bar.js');
    const { transition } = await import('/dist/transition-entry.js');
    const hosts = [320, 740].map(width => { const host = document.createElement('div'); host.style.width = `${width}px`; document.body.append(host); return host; });
    const a = bar([{ key: 'A', value: 1, other: 4 }]).x('key').y('value');
    const pairs = await Promise.all(hosts.map(target => transition(a, a.y('other'), { target, d3 })));
    const ids = hosts.flatMap(host => [...host.querySelectorAll('clipPath')].map(node => node.id));
    const references = hosts.every(host => [...host.querySelectorAll('[clip-path]')].every(node => {
      const id = node.getAttribute('clip-path').slice(5, -1);
      return host.querySelector(`[id="${id}"]`);
    }));
    pairs.forEach(pair => pair.destroy()); hosts.forEach(host => host.remove());
    return { ids, references };
  });
  expect(result.ids.length).toBeGreaterThan(1);
  expect(new Set(result.ids).size).toBe(result.ids.length);
  expect(result.references).toBe(true);
});
