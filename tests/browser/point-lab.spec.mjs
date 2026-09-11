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
    await expect(page.locator('#scenario option')).toHaveCount(13);
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

test('point focus moves the view without filtering points', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#focus');
  await ready(page);
  const start = await page.locator('#chart circle.sl-point').evaluateAll(nodes =>
    nodes.map(node => [node.getAttribute('data-key'), node.getAttribute('cx'), node.getAttribute('cy')]));
  await page.locator('#end').click();
  await expect(page.locator('#chart circle.sl-point')).toHaveCount(6);
  const focused = await page.locator('#chart circle.sl-point').evaluateAll(nodes =>
    nodes.map(node => [node.getAttribute('data-key'), node.getAttribute('cx'), node.getAttribute('cy')]));
  expect(focused).not.toEqual(start);
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

test('point combine starts slowly and accelerates into the summary', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#rollup');
  await ready(page);
  const positionAt = async (progress) => {
    await page.locator('#progress').fill(String(progress));
    return page.locator('#chart circle.sl-point[data-key="detail:A"]').evaluate(node => ({
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy'))
    }));
  };
  const start = await positionAt(0);
  const early = await positionAt(0.12);
  const later = await positionAt(0.38);
  const gathered = await positionAt(0.49);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wholeMove = distance(start, gathered);
  const earlyShare = distance(start, early) / wholeMove;
  const laterShare = distance(start, later) / wholeMove;
  expect(earlyShare).toBeLessThan(0.08);
  expect(laterShare).toBeGreaterThan(0.75);
});

test('point detail sets the view before summary points spread', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const frames = await page.evaluate(async () => {
    const [{ point }, { transition }] = await Promise.all([
      import('/dist/point.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="chart"></div>';
    const rows = [
      { id: 'A', region: 'North', x: 10, y: 20 },
      { id: 'B', region: 'North', x: 20, y: 30 },
      { id: 'C', region: 'South', x: 70, y: 80 },
      { id: 'D', region: 'South', x: 90, y: 60 }
    ];
    const detail = point(rows).x('x', { title: 'X' }).y('y', { title: 'Y' })
      .key('id').color('region');
    const summary = detail.rollup('region', { key: 'region' });
    const change = await transition(summary, detail, {
      target: '#chart', d3, aq, height: 360
    });
    const snapshot = () => ({
      points: [...document.querySelectorAll('#chart circle.sl-point')]
        .filter(node => Number(node.style.opacity || 1) > 0)
        .map(node => node.getAttribute('data-key'))
        .sort(),
      axes: [...document.querySelectorAll('#chart .sl-x-axis .tick, #chart .sl-y-axis .tick')]
        .map(node => [node.textContent, node.getAttribute('transform')])
    });
    change.progress(0);
    const start = snapshot();
    change.progress(0.49);
    const viewSet = snapshot();
    change.progress(1);
    const end = snapshot();
    return { start, viewSet, end };
  });

  expect(frames.start.points).toHaveLength(2);
  expect(frames.viewSet.points).toHaveLength(2);
  expect(frames.end.points).toHaveLength(4);
  expect(frames.viewSet.axes).not.toEqual(frames.start.axes);
  expect(frames.start.axes).not.toEqual(frames.end.axes);
});

test('point lab Blend is deterministic decoration and Clean removes it', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#breakdown');
  await ready(page);
  const effect = page.locator('#point-effect');
  await expect(effect).toHaveValue('blend');

  await page.locator('#progress').fill('0.75');
  const layer = page.locator('#chart .sl-point-blend-layer');
  await expect(layer).toHaveCount(1);
  const first = await layer.evaluate(node => ({
    opacity: Number(node.style.opacity),
    circles: [...node.querySelectorAll('circle')].map(circle => [
      circle.getAttribute('cx'), circle.getAttribute('cy'), circle.getAttribute('r')
    ])
  }));
  expect(first.opacity).toBeGreaterThan(0.5);
  await expect(page.locator('#chart .sl-point-crisp-layer')).toHaveCSS('opacity', '0');
  // Six entering detail circles plus two exiting summary circles share the
  // temporary layer while the same cached frame remains reversible.
  expect(first.circles).toHaveLength(8);

  await page.locator('#progress').fill('0.2');
  await page.locator('#progress').fill('0.75');
  expect(await layer.evaluate(node => ({
    opacity: Number(node.style.opacity),
    circles: [...node.querySelectorAll('circle')].map(circle => [
      circle.getAttribute('cx'), circle.getAttribute('cy'), circle.getAttribute('r')
    ])
  }))).toEqual(first);

  await effect.selectOption('clean');
  await ready(page);
  await page.locator('#progress').fill('0.75');
  await expect(page.locator('#chart .sl-point-blend-layer')).toHaveCount(0);
  await expect(page.locator('#chart .sl-point-crisp-layer')).toHaveCSS('opacity', '1');
});

test('point Blend parent exists only while a child is close enough to connect', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/point-lab.html#breakdown');
  await ready(page);

  const connectionFrames = async (progressValues) => {
    const frames = [];
    for (const progress of progressValues) {
      await page.locator('#progress').fill(String(progress));
      frames.push(await page.locator('#chart .sl-point-blend-group').evaluateAll(groups =>
        groups.map(group => {
          const parent = group.querySelector('[data-blend-role="parent"]');
          const children = [...group.querySelectorAll('[data-blend-role="child"]')];
          if (!parent) return null;
          const px = Number(parent.getAttribute('cx'));
          const py = Number(parent.getAttribute('cy'));
          const strengths = children.map(child => {
            const distance = Math.hypot(
              Number(child.getAttribute('cx')) - px,
              Number(child.getAttribute('cy')) - py
            );
            const disconnectAt = Number(child.getAttribute('r')) + 10;
            const shrinkFrom = disconnectAt * 0.7;
            const t = Math.max(0, Math.min(1,
              (distance - shrinkFrom) / (disconnectAt - shrinkFrom)
            ));
            return 1 - t * t * (3 - 2 * t);
          });
          return {
            radius: Number(parent.getAttribute('r')),
            connectedShare: strengths.reduce((sum, strength) => sum + strength, 0) / children.length,
            childIsClose: strengths.some(strength => strength > 0)
          };
        }).filter(Boolean)
      ));
    }
    return frames;
  };

  const splitFrames = await connectionFrames([0.66, 0.72, 0.78, 0.84, 0.9, 0.96]);
  for (const frame of splitFrames) {
    for (const parent of frame) {
      expect(parent.radius <= 0.01 || parent.childIsClose).toBe(true);
    }
  }
  expect(splitFrames.some(frame => frame.some(parent => parent.radius > 1))).toBe(true);
  expect(splitFrames.some(frame => frame.some(parent => parent.radius <= 0.01))).toBe(true);
  // Before the endpoint guard is needed, each of the three children owns one
  // third of the authored 24px final parent radius.
  for (const frame of splitFrames.slice(0, 3)) {
    for (const parent of frame) {
      expect(parent.radius / 24).toBeCloseTo(parent.connectedShare, 4);
    }
  }

  await page.locator('#scenario').selectOption('rollup');
  await ready(page);
  const mergeFrames = await connectionFrames([0.04, 0.1, 0.16, 0.22, 0.28, 0.34]);
  for (const frame of mergeFrames) {
    for (const parent of frame) {
      expect(parent.radius <= 0.01 || parent.childIsClose).toBe(true);
    }
  }
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
