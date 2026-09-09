import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.beforeEach(async ({ page }) => {
  for (const [name, path] of [
    ['d3', '../../node_modules/d3/dist/d3.min.js'],
    ['arquero', '../../node_modules/arquero/dist/arquero.min.js']
  ]) {
    await page.route(`https://cdn.jsdelivr.net/npm/${name}@*/dist/*.js`, route =>
      route.fulfill({
        path: fileURLToPath(new URL(path, import.meta.url)),
        contentType: 'text/javascript'
      })
    );
  }
});

test('the extracted minimal example uses the adapter and VisDelta core together', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/scrollytelling/examples/minimal/');
  await expect(page.locator('rect.sl-bar')).toHaveCount(3);
  const nav = page.locator('.sl-nav button');
  await expect(nav).toHaveCount(2);
  await nav.nth(1).click();
  await expect(nav.nth(1)).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});
