import { test, expect } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`canonical documentation homepage works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/index.html');
    await expect(page).toHaveURL(/\/docs\/\.vitepress\/dist\/$/);
    await expect(page).toHaveTitle(/VisDelta/);
    await expect(page.getByRole('heading', { name: 'Declare states. Control frames.' })).toBeVisible();

    const workbench = page.locator('.transition-workbench');
    await workbench.scrollIntoViewIfNeeded();
    await expect(workbench.locator('.workbench-kicker')).toContainText('Ready');
    await expect(workbench.locator('rect.vd-bar')).toHaveCount(4);

    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
