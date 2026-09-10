import { test, expect } from '@playwright/test';
import { pointScenarios } from '../../examples/point/scenarios.js';

const ready = page => expect(page.locator('#status')).toHaveText('Ready');
const snapshot = page => page.locator('#chart svg').evaluate(svg =>
  Array.from(svg.querySelectorAll('circle.sl-point, .tick, .sl-legend-item')).map(node => ({
    tag: node.tagName,
    text: node.textContent,
    attrs: Array.from(node.attributes).map(attr => [attr.name, attr.value]).sort()
  })));

for (const sample of pointScenarios) {
  test(`point lab ${sample.id}: editable pair and reversible seek`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/docs/.vitepress/dist/point-lab.html#${sample.id}`);
    await ready(page);
    await expect(page.locator('#scenario option')).toHaveCount(12);
    const editor = page.getByRole('textbox', { name: 'Editable VisDelta code' });
    await expect(editor).toHaveValue(sample.code);

    const start = await snapshot(page);
    await page.locator('#progress').fill('0.37');
    const direct = await snapshot(page);
    expect(direct).not.toEqual(start);
    await page.locator('#end').click();
    expect(await snapshot(page)).not.toEqual(start);
    await page.locator('#progress').fill('0.2');
    await page.locator('#progress').fill('0.37');
    expect(await snapshot(page)).toEqual(direct);
    await page.locator('#start').click();
    expect(await snapshot(page)).toEqual(start);

    await editor.fill(sample.code.replace('income: 42', 'income: 22'));
    await expect(page.locator('#status')).toHaveText('Waiting for input');
    await ready(page);
    await expect(editor).toHaveValue(/income: 22/);
    await page.locator('#reset').click();
    await ready(page);
    await expect(editor).toHaveValue(sample.code);
    expect(errors).toEqual([]);
  });
}

test('point radius, highlight, and cached node identity are real renderer behavior', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#highlight');
  await ready(page);
  const result = await page.evaluate(() => {
    const chart = document.querySelector('#chart');
    const before = [...chart.querySelectorAll('circle.sl-point')];
    document.querySelector('#progress').value = '1';
    document.querySelector('#progress').dispatchEvent(new Event('input', { bubbles: true }));
    const after = [...chart.querySelectorAll('circle.sl-point')];
    return {
      reused: before.every(node => after.includes(node)),
      opacity: after.map(node => Number(node.style.opacity)).sort()
    };
  });
  expect(result.reused).toBe(true);
  expect(result.opacity.filter(value => value === 1)).toHaveLength(3);
  expect(result.opacity.filter(value => value === 0.12)).toHaveLength(3);

  await page.locator('#scenario').selectOption('size');
  await ready(page);
  await page.locator('#start').click();
  await expect(page.locator('#chart circle.sl-point').first()).toHaveAttribute('r', '6');
  await page.locator('#end').click();
  const radii = await page.locator('#chart circle.sl-point').evaluateAll(nodes =>
    nodes.map(node => Number(node.getAttribute('r'))));
  expect(new Set(radii.map(value => value.toFixed(3))).size).toBeGreaterThan(1);
});

test('point flip changes the authored first axis before the second axis', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#flip');
  await ready(page);
  const positions = async () => page.locator('#chart circle.sl-point').evaluateAll(nodes =>
    nodes.map(node => ({
      key: node.getAttribute('data-key'),
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy'))
    })).sort((a, b) => a.key.localeCompare(b.key)));
  const start = await positions();
  await page.locator('#progress').fill('0.24');
  const firstAxis = await positions();
  expect(firstAxis.map(point => point.y)).toEqual(start.map(point => point.y));
  expect(firstAxis.map(point => point.x)).not.toEqual(start.map(point => point.x));
});

test('opposite point flip endpoints use the same transition in reverse', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const frames = await page.evaluate(async () => {
    const [{ point }, { transition }] = await Promise.all([
      import('/dist/point.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="forward"></div><div id="reverse"></div>';
    const rows = [
      { id: 'A', income: 12, health: 61 },
      { id: 'B', income: 36, health: 48 },
      { id: 'C', income: 57, health: 77 }
    ];
    const base = point(rows).x('income').y('health').key('id');
    const flipped = base.flip({ order: ['y', 'x'] });
    const options = target => ({ target, d3, aq, height: 360 });
    const forward = await transition(base, flipped, options('#forward'));
    const reverse = await transition(flipped, base, options('#reverse'));
    const geometry = selector => [...document.querySelectorAll(`${selector} circle.sl-point`)]
      .map(node => ({
        key: node.getAttribute('data-key'),
        x: Number(Number(node.getAttribute('cx')).toFixed(9)),
        y: Number(Number(node.getAttribute('cy')).toFixed(9))
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
    return [0, 0.17, 0.49, 0.76, 1].map(progress => {
      forward.progress(progress);
      reverse.progress(1 - progress);
      return { forward: geometry('#forward'), reverse: geometry('#reverse') };
    });
  });
  for (const frame of frames) expect(frame.reverse).toEqual(frame.forward);
});

test('point rollup and breakdown are the same transition in reverse', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const frames = await page.evaluate(async () => {
    const [{ point }, { transition }] = await Promise.all([
      import('/dist/point.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="split"></div><div id="merge"></div>';
    const rows = [
      { id: 'A', region: 'North', x: 12, y: 20 },
      { id: 'B', region: 'North', x: 24, y: 32 },
      { id: 'C', region: 'South', x: 55, y: 48 },
      { id: 'D', region: 'South', x: 68, y: 61 }
    ];
    const detailed = point(rows).x('x').y('y').key('id').color('region');
    const summary = detailed.rollup('region', { key: 'region', sizeRange: [10, 22] });
    const options = target => ({ target, d3, aq, height: 360 });
    const split = await transition(summary, detailed, options('#split'));
    const merge = await transition(detailed, summary, options('#merge'));
    const geometry = selector => [...document.querySelectorAll(`${selector} circle.sl-point`)]
      .map(node => ({
        key: node.getAttribute('data-key'),
        x: Number(node.getAttribute('cx')),
        y: Number(node.getAttribute('cy')),
        r: Number(node.getAttribute('r')),
        opacity: Number(node.style.opacity)
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
    return [0, 0.13, 0.5, 0.82, 1].map(progress => {
      split.progress(progress);
      merge.progress(1 - progress);
      return { split: geometry('#split'), merge: geometry('#merge') };
    });
  });
  for (const frame of frames) expect(frame.merge).toEqual(frame.split);
});

test('point lab fits a narrow viewport and keeps progress after resize', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#rollup');
  await ready(page);
  await page.locator('#progress').fill('0.37');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#value')).toHaveText('0.37');
  await expect(page.locator('#editor')).toBeVisible();
  await page.locator('#progress').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/point-lab-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.screenshot({ path: 'test-results/point-lab-desktop.png', fullPage: true });
});
