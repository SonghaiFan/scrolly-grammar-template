import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const templates = [];
for (const file of ['README.md', 'docs/getting-started.md', 'docs/for-cdn-users.md', 'examples/minimal/index.html']) {
  const source = await readFile(join(root, file), 'utf8');
  const blocks = file.endsWith('.html') ? [source] : [...source.matchAll(/```html\n([\s\S]*?)```/g)].map(match => match[1]);
  for (const html of blocks) {
    if (!html.includes('await createStory(') && !html.includes('await transition(')) continue;
    templates.push({ file, html, pair: html.includes('await transition(') });
  }
}
if (templates.length !== 5) throw new Error('Expected four Story templates and one standalone CDN template.');
let temp;
let dependencies;

test.beforeAll(async () => {
  temp = await mkdtemp(join(tmpdir(), 'scrollylite-cdn-package-'));
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], {
    cwd: root, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(tmpdir(), 'scrollylite-npm-cache') }
  }));
  execFileSync('tar', ['-xzf', join(temp, packed.filename), '-C', temp]);
  dependencies = Object.fromEntries(await Promise.all(['d3', 'arquero'].map(async name => {
    const output = await build({ entryPoints: [require.resolve(name)], bundle: true, format: 'esm', write: false, minify: true });
    return [name, output.outputFiles[0].text];
  })));
});

test.afterAll(async () => { if (temp) await rm(temp, { recursive: true, force: true }); });

for (const { file, html, pair } of templates) {
  test(`${file}: ${pair ? 'standalone' : 'Story'} CDN template runs against the candidate tarball`, async ({ page }) => {
    const errors = [];
    const requested = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://cdn.jsdelivr.net/npm/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const dependency = path.match(/^\/npm\/(d3|arquero)@\d+\/\+esm$/)?.[1];
      if (dependency) {
        await route.fulfill({ body: dependencies[dependency], contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
        return;
      }
      const prefix = `/npm/scrollylite@${version}/`;
      expect(path.startsWith(prefix), `unexpected external dependency: ${path}`).toBe(true);
      const relative = decodeURIComponent(path.slice(prefix.length));
      const packageRoot = resolve(temp, 'package');
      const resource = resolve(packageRoot, relative);
      expect(resource.startsWith(packageRoot + sep)).toBe(true);
      requested.push(relative);
      await route.fulfill({ path: resource, contentType: extname(resource) === '.css' ? 'text/css' : 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
    });
    await page.route('**/__release-template__', route => route.fulfill({ body: html, contentType: 'text/html' }));
    await page.goto('/__release-template__');
    const bars = page.locator('rect.sl-bar');
    await expect(bars).toHaveCount(3);
    await expect(bars.first()).toBeVisible();
    if (pair) {
      const geometry = () => bars.evaluateAll(nodes => nodes.map(node => ['x', 'y', 'width', 'height'].map(name => node.getAttribute(name))));
      const first = await geometry();
      await page.locator('#progress').fill('1');
      const last = await geometry();
      expect(last).not.toEqual(first);
      await page.locator('#progress').fill('0.37');
      const mid = await geometry();
      expect(mid).not.toEqual(first); expect(mid).not.toEqual(last);
      await page.locator('#progress').fill('0');
      expect(await geometry()).toEqual(first);
      await page.locator('#play').click();
      await expect.poll(geometry).toEqual(last);
      expect(requested.some(path => /\/(?:scrollylite|story|navigation)\.js$|\/scroll-drivers\/|\/charts\/(?:line|point|unit)\//.test(path))).toBe(false);
    } else {
      const nav = page.locator('.sl-nav button');
      await expect(nav).toHaveCount(2);
      await nav.nth(1).click();
      await expect(nav.nth(1)).toHaveClass(/is-active/);
      await expect.poll(() => page.locator('rect.sl-bar[data-key="A"]').evaluate(node => Number(getComputedStyle(node).opacity))).toBeLessThan(0.5);
      await expect(page.locator('rect.sl-bar[data-key="B"]')).toHaveCSS('opacity', '1');
    }
    expect(requested).toContain('dist/scrollylite.css');
    expect(errors).toEqual([]);
  });
}
