import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.beforeEach(async ({ page }) => {
  // Exercise the real example with pinned installed dependencies, not CDN
  // availability. Production markup/data/compiler paths remain unchanged.
  for (const [name, path] of [['d3', '../../node_modules/d3/dist/d3.min.js'], ['arquero', '../../node_modules/arquero/dist/arquero.min.js']]) {
    await page.route(`https://cdn.jsdelivr.net/npm/${name}@*/dist/*.js`, route =>
      route.fulfill({ path: fileURLToPath(new URL(path, import.meta.url)), contentType: 'text/javascript' }));
  }
});

for (const chartType of ['bar', 'line', 'point', 'unit']) {
  for (const layout of ['floatToText', 'textOverVis']) {
    test(`${chartType} / ${layout}: every weather step renders through real navigation`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/scrollytelling/examples/weather/?story=${chartType}&layout=${layout}&theme=dark`);
      await page.waitForFunction(() => Boolean(window.__scrollytellingStory));
      const buttons = page.locator('.sl-nav button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(1);
      for (const index of [...Array(count).keys(), 0]) {
        await buttons.nth(index).click();
        await expect(buttons.nth(index)).toHaveClass(/is-active/);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const invalid = await page.locator('#app svg').evaluateAll(nodes => nodes.flatMap(svg =>
          [...svg.querySelectorAll('*')].flatMap(node => [...node.attributes]
            .filter(attr => /(?:NaN|Infinity)/.test(attr.value)).map(attr => `${node.tagName}:${attr.name}=${attr.value}`))));
        expect(invalid, `step ${index}`).toEqual([]);
        await expect(page.locator('#app svg').first()).toBeVisible();
      }
      await page.evaluate(() => window.__scrollytellingStory.destroy());
      expect(errors).toEqual([]);
    });
  }
}
