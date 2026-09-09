import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/scrollytelling/tests/fixture.html'); });

test('Story themes/colors and standalone pair themes stay isolated across resize and destroy', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { bar, transition } = await import('/dist/index.js');
    const { story, createStory } = await import('/scrollytelling/dist/index.js');
    const hosts = [0, 1, 2].map(() => { const host = document.createElement('div'); host.style.width = '700px'; document.body.append(host); return host; });
    const rootAccent = document.documentElement.style.getPropertyValue('--sl-accent');
    const rows = [{ category: 'A', value: 2 }, { category: 'B', value: 4 }];
    const make = (data, palette, accent) => {
      const base = bar(data).x('category').y('value').color('category').transition({ duration: 0 });
      return story().theme({ series: palette, accent }).add('All', base).add('A', base.where({ category: 'A' })).toSpec();
    };
    const first = await createStory(make(rows, ['#ff0000', '#ff9900'], '#aa0000'), { target: hosts[0], d3, aq });
    first.scrollDriver.destroy();
    const second = await createStory(make([...rows].reverse(), ['#0000ff', '#00ff00'], '#0000aa'), { target: hosts[1], d3, aq });
    second.scrollDriver.destroy();
    const fill = (host, key) => [...host.querySelectorAll('rect.sl-bar')].find(node => node.getAttribute('data-key') === key)?.getAttribute('fill');
    const initial = [fill(hosts[0], 'A'), fill(hosts[1], 'A')];
    first.to(1);
    await new Promise(resolve => setTimeout(resolve, 100));
    const afterSecondMount = fill(hosts[0], 'A');
    first.destroy();
    second.to(1);
    hosts[1].style.setProperty('--sl-series-2', '#00ffff');
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => setTimeout(resolve, 100));
    const afterFirstDestroy = fill(hosts[1], 'A');
    hosts[2].style.setProperty('--sl-accent', '#123456');
    const a = bar([{ x: 'X', value: 2, other: 3 }]).x('x').y('value').color({ value: 'var(--sl-accent)' });
    const pair = await transition(a, a.y('other'), { target: hosts[2], d3 });
    const pairFill = hosts[2].querySelector('rect.sl-bar').getAttribute('fill');
    const noRootMutation = document.documentElement.style.getPropertyValue('--sl-accent') === rootAccent;
    const ownAccent = hosts[1].style.getPropertyValue('--sl-accent');
    pair.destroy(); second.destroy(); hosts.forEach(host => host.remove());
    return { initial, afterSecondMount, afterFirstDestroy, pairFill, ownAccent, noRootMutation };
  });
  expect(result.initial).toEqual(['#ff0000', '#00ff00']);
  expect(result.afterSecondMount).toBe('#ff0000');
  // D3 may normalize colors during transitions; compare the concrete rendered value.
  expect(['#00ffff', 'rgb(0, 255, 255)']).toContain(result.afterFirstDestroy);
  expect(result.pairFill).toBe('#123456');
  expect(result.ownAccent).toBe('#0000aa');
  expect(result.noRootMutation).toBe(true);
});

test('theme tokens restore priorities without overwriting later application changes', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createPage } = await import('/scrollytelling/dist/index.js');
    const host = document.createElement('div'); document.body.append(host);
    host.style.setProperty('--sl-accent', '#222222', 'important');
    const runtime = await createPage({ theme: { colorPrimary: '#ff0000', background: '#ffffff', muted: '#888888' }, steps: [{}] }, { target: host });
    const during = host.style.getPropertyValue('--sl-accent');
    host.style.setProperty('--sl-bg', '#333333');
    host.style.setProperty('--sl-muted', '#888888', 'important');
    runtime.destroy(); runtime.destroy();
    const result = { during, after: host.style.getPropertyValue('--sl-accent'), priority: host.style.getPropertyPriority('--sl-accent'), app: host.style.getPropertyValue('--sl-bg'), appPriority: host.style.getPropertyPriority('--sl-muted') };
    host.remove(); return result;
  });
  expect(result).toEqual({ during: '#ff0000', after: '#222222', priority: 'important', app: '#333333', appPriority: 'important' });
});

test('application-owned stylesheets survive and malformed URLs acquire no resources', async ({ page }) => {
  await page.route('**/app-owned.css', route => route.fulfill({ contentType: 'text/css', body: ':root { --app-proof: 1; }' }));
  const result = await page.evaluate(async () => {
    const { createPage } = await import('/scrollytelling/dist/index.js');
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/app-owned.css';
    await new Promise((resolve, reject) => { link.onload = resolve; link.onerror = reject; document.head.append(link); });
    const host = document.createElement('div'); document.body.append(host);
    const runtime = await createPage({ theme: { href: '/app-owned.css' }, steps: [{}] }, { target: host });
    runtime.destroy();
    let rejected = false;
    try { await createPage({ theme: { stylesheets: ['/unused.css', 'http://[invalid'] }, steps: [{}] }, { target: host }); }
    catch { rejected = true; }
    const result = { retained: link.isConnected, rejected, owned: document.querySelectorAll('link[data-scrollytelling-theme]').length };
    link.remove(); host.remove(); return result;
  });
  expect(result).toEqual({ retained: true, rejected: true, owned: 0 });
});

test('shared stylesheet waits for load and is released only after the last instance', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/shared-theme.css', async route => { await gate; await route.fulfill({ contentType: 'text/css', body: '.shared-theme-proof { color: red; }' }); });
  await page.evaluate(async () => {
    const { createPage } = await import('/scrollytelling/dist/index.js');
    window.hosts = [0, 1].map(() => { const host = document.createElement('div'); document.body.append(host); return host; });
    window.finished = 0;
    window.pendingThemes = hosts.map(target => createPage({ theme: { href: '/shared-theme.css' }, steps: [{}] }, { target }).then(runtime => { finished++; return runtime; }));
  });
  await expect(page.locator('link[href$="/shared-theme.css"]')).toHaveCount(1);
  expect(await page.evaluate(() => finished)).toBe(0);
  release();
  await page.evaluate(async () => { window.themeRuntimes = await Promise.all(pendingThemes); });
  await page.evaluate(() => themeRuntimes[0].destroy());
  await expect(page.locator('link[href$="/shared-theme.css"]')).toHaveCount(1);
  await page.evaluate(() => { themeRuntimes[1].destroy(); hosts.forEach(host => host.remove()); });
  await expect(page.locator('link[href$="/shared-theme.css"]')).toHaveCount(0);
});

test('failed data, stylesheet and rendering initialization preserve original nodes and theme', async ({ page }) => {
  await page.route('**/missing-theme.css', route => route.fulfill({ status: 404, body: '' }));
  const result = await page.evaluate(async () => {
    const { bar } = await import('/dist/index.js');
    const { story, createStory, createChart, createPage } = await import('/scrollytelling/dist/index.js');
    const host = document.createElement('div'); host.className = 'original'; document.body.append(host);
    const original = document.createElement('button'); host.append(original);
    let clicks = 0; original.onclick = () => clicks++;
    host.style.setProperty('--sl-accent', '#abcdef');
    const a = bar([{ x: 'A', value: 2 }]).x('x').y('value');
    const spec = story().theme({ accent: '#ff0000' }).add('Filter', a.where({ x: 'A' })).toSpec();
    const errors = [];
    for (const create of [createChart, createStory]) {
      try { await create(spec, { target: host, d3 }); } catch (error) { errors.push(error.message); }
    }
    try { await createPage({ theme: { href: '/missing-theme.css' }, steps: [{}] }, { target: host }); } catch (error) { errors.push(error.message); }
    const dataSpec = { ...spec, data: { bad: { url: '/bad.csv' } } };
    try { await createStory(dataSpec, { target: host, d3: { ...d3, csv: async () => { throw new Error('data failure'); } } }); } catch (error) { errors.push(error.message); }
    original.click();
    const result = { errors, identity: host.firstChild === original, count: host.childNodes.length, className: host.className, accent: host.style.getPropertyValue('--sl-accent'), clicks };
    host.remove(); return result;
  });
  expect(result.errors).toHaveLength(4);
  expect(result.errors[0]).toContain('Arquero');
  expect(result.errors[1]).toContain('Arquero');
  expect(result.errors[2]).toContain('stylesheet failed');
  expect(result.errors[3]).toContain('data failure');
  expect(result).toMatchObject({ identity: true, count: 1, className: 'original', accent: '#abcdef', clicks: 1 });
  await expect(page.locator('link[data-scrollytelling-theme]')).toHaveCount(0);
});
