import { test, expect } from '@playwright/test';
import { scenarios } from '../../examples/transition/scenarios.js';

const ready = page => expect(page.locator('#status')).toHaveText('Ready');
const snapshot = page => page.locator('#chart svg').evaluateAll(svgs => svgs.map(svg =>
  Array.from(svg.querySelectorAll('rect.sl-bar, .tick')).map(node => ({
    tag: node.tagName, text: node.textContent,
    attrs: Array.from(node.attributes).map(attr => [attr.name, attr.value]).sort()
  }))));

for (const sample of scenarios) {
  test(`lab ${sample.id}: editable pair, reversible seek, working endpoints`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/examples/transition/#${sample.id}`);
    await ready(page);
    await expect(page.locator('#scenario option')).toHaveCount(12);
    const editor = page.getByRole('textbox', { name: 'Editable ScrollyLite code' });
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

    await editor.fill(sample.code.replaceAll('category: "A"', 'category: "Edited"'));
    await expect(page.locator('#status')).toHaveText('Waiting for input');
    await ready(page);
    await expect(page.locator('#chart')).toContainText('Edited');
    await page.locator('#reset').click();
    await ready(page);
    await expect(editor).toHaveValue(sample.code);
    await expect(page.locator('#chart')).not.toContainText('Edited');
    expect(errors).toEqual([]);
  });
}

test('invalid code and invalid pairs preserve preview; reset recovers', async ({ page }) => {
  await page.goto('/examples/transition/');
  await ready(page);
  const editor = page.locator('#editor');
  const original = await snapshot(page);
  for (const code of ['const broken = ;', 'return {};', 'return { from: { mark: "line" }, to: { mark: "line" } };',
    'const from = bar().data("missing-dataset").x("category").y("value"); return { from, to: from };']) {
    await editor.fill(code);
    await expect(page.locator('#status')).toHaveText('Error');
    await expect(page.getByRole('alert')).toContainText('last successful preview');
    expect(await snapshot(page)).toEqual(original);
    await expect(page.locator('#chart > div')).toHaveCount(1);
  }
  await page.locator('#reset').click();
  await ready(page);
  await expect(page.getByRole('alert')).toBeHidden();
});

test('manual run, drafts, switching and playback controls', async ({ page }) => {
  await page.goto('/examples/transition/');
  await ready(page);
  await page.locator('#auto-run').uncheck();
  const edited = scenarios[0].code.replaceAll('category: "A"', 'category: "Draft"');
  await page.locator('#editor').fill(edited);
  await expect(page.locator('#status')).toHaveText('Edited · press Run');
  await expect(page.locator('#chart')).not.toContainText('Draft');
  await page.locator('#run').click();
  await ready(page);
  await expect(page.locator('#chart')).toContainText('Draft');
  await page.locator('#scenario').selectOption('grouped-split');
  await ready(page);
  await expect(page.locator('#editor')).toHaveValue(scenarios.find(s => s.id === 'grouped-split').code);
  await page.locator('#end').click();
  await page.locator('#scenario').selectOption('measure');
  await ready(page);
  await expect(page.locator('#editor')).toHaveValue(edited);
  await expect(page.locator('#value')).toHaveText('0.00');
  await page.locator('#play').click();
  await expect(page.locator('#value')).toHaveText('1.00');
  await page.locator('#reverse').click();
  await expect(page.locator('#value')).toHaveText('0.00');
  await page.locator('#play').click();
  await page.locator('#pause').click();
  const paused = await page.locator('#value').textContent();
  await page.waitForTimeout(150);
  await expect(page.locator('#value')).toHaveText(paused);
});

test('late async evaluation cannot overwrite a newer edit', async ({ page }) => {
  await page.goto('/examples/transition/');
  await ready(page);
  await page.locator('#auto-run').uncheck();
  await page.locator('#editor').fill(`await new Promise(resolve => { window.releaseLabRun = resolve; });\n${scenarios[0].code.replaceAll('category: "A"', 'category: "Stale"')}`);
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('Compiling');
  await page.locator('#scenario').selectOption('filter');
  await ready(page);
  await page.evaluate(() => window.releaseLabRun());
  await page.locator('#end').click();
  await expect(page.locator('#chart rect.sl-bar')).toHaveCount(2);
  await expect(page.locator('#chart')).not.toContainText('Stale');
  await expect(page.locator('#chart > div')).toHaveCount(1);
});

test('narrow layout fits and resize preserves progress', async ({ page }) => {
  await page.goto('/examples/transition/#split');
  await ready(page);
  await page.locator('#progress').fill('0.37');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#value')).toHaveText('0.37');
  await expect(page.locator('#editor')).toBeVisible();
  await page.locator('#progress').scrollIntoViewIfNeeded();
  await expect(page.locator('#progress')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/transition-lab-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.screenshot({ path: 'test-results/transition-lab-desktop.png', fullPage: true });
});
