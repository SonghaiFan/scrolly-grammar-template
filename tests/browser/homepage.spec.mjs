import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

for (const width of [1100, 390]) {
  test(`homepage ${width}px: showcase, button and progress examples render independently`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'warning' && /failed:/i.test(msg.text())) errors.push(msg.text()); });
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    for (const name of ['d3', 'arquero']) {
      await page.route(`https://cdn.jsdelivr.net/npm/${name}@*/dist/*.js`, route => route.fulfill({
        path: fileURLToPath(new URL(`../../node_modules/${name}/dist/${name}.min.js`, import.meta.url)), contentType: 'text/javascript'
      }));
    }
    await page.goto('/index.html');
    for (const id of ['hero-chart', 'showcase-chart-view', 'btn-demo-chart', 'slider-demo-chart']) {
      await expect.poll(() => page.locator(`#${id} rect.sl-bar`).count()).toBeGreaterThan(0);
    }
    const geometry = id => page.locator(`#${id} rect.sl-bar`).evaluateAll(nodes => nodes.map(node =>
      ['x', 'y', 'width', 'height'].map(name => node.getAttribute(name))));
    const initialButton = await geometry('btn-demo-chart');
    const initialSlider = await geometry('slider-demo-chart');
    const slider = page.locator('#slider-demo-input');
    await slider.fill('0.37');
    const middle = await geometry('slider-demo-chart');
    expect(middle).not.toEqual(initialSlider);
    expect(await geometry('btn-demo-chart')).toEqual(initialButton);
    await slider.fill('0.8'); await slider.fill('0.37');
    expect(await geometry('slider-demo-chart')).toEqual(middle);
    await page.locator('#btn-demo-btn').click();
    await expect.poll(() => geometry('btn-demo-chart')).not.toEqual(initialButton);
    expect(await geometry('slider-demo-chart')).toEqual(middle);
    const steps = page.locator('#showcase-steps .code-step');
    await expect(steps).toHaveCount(7);
    for (const index of [1, 2, 3, 4, 5, 6, 0]) {
      await steps.nth(index).click();
      await expect(steps.nth(index)).toHaveClass(/is-active/);
      const invalid = await page.locator('#showcase-chart-view svg').evaluateAll(nodes => nodes.some(svg =>
        [...svg.querySelectorAll('*')].some(node => [...node.attributes].some(attr => /NaN|Infinity/.test(attr.value)))));
      expect(invalid).toBe(false);
    }
    expect(requests.some(path => path.includes('/node_modules/'))).toBe(false);
    expect(errors).toEqual([]);
  });
}
