import { test, expect } from '@playwright/test';
import { scenarios } from '../../examples/line/scenarios.js';

const ready = page => expect(page.locator('#status')).toHaveText('Ready');
const snapshot = page => page.locator('#chart svg').evaluate(svg =>
  Array.from(svg.querySelectorAll('path.sl-line, circle.sl-line-point, .tick, .sl-legend-item')).map(node => ({
    tag: node.tagName,
    text: node.textContent,
    attrs: Array.from(node.attributes).map(attr => [attr.name, attr.value]).sort(),
    opacity: node.style.opacity
  })));

for (const sample of scenarios) {
  test(`line lab ${sample.id}: editable pair and reversible seek`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/docs/.vitepress/dist/line-lab.html#${sample.id}`);
    await ready(page);
    await expect(page.locator('#scenario option')).toHaveCount(16);
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

    await editor.fill(sample.code.replace('sales: 28', 'sales: 22'));
    await expect(page.locator('#status')).toHaveText('Waiting for input');
    await ready(page);
    await expect(editor).toHaveValue(/sales: 22/);
    await page.locator('#reset').click();
    await ready(page);
    await expect(editor).toHaveValue(sample.code);
    expect(errors).toEqual([]);
  });
}

test('line highlight and style are real renderer behavior', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#highlight');
  await ready(page);
  await page.locator('#end').click();
  const highlightedLines = await page.locator('#chart path.sl-line').evaluateAll(nodes =>
    nodes.map(node => ({
      key: node.getAttribute('data-key'),
      opacity: Number(node.style.opacity),
      row: node.__data__?.rows?.[0]
    })).sort((a, b) => a.key.localeCompare(b.key)));
  expect(highlightedLines.map(line => line.opacity).sort()).toEqual([0.12, 1]);

  await page.locator('#scenario').selectOption('style');
  await ready(page);
  await page.locator('#start').click();
  await expect(page.locator('#chart path.sl-line')).toHaveAttribute('stroke-width', '2');
  await page.locator('#progress').fill('0.55');
  const pathShape = await page.locator('#chart path.sl-line').evaluate(node => {
    const length = node.getTotalLength();
    const points = Array.from({ length: 101 }, (_, index) =>
      node.getPointAtLength(length * index / 100));
    return {
      d: node.getAttribute('d'),
      length,
      backwards: points.some((point, index) => index > 0 && point.x < points[index - 1].x - 0.5)
    };
  });
  expect(pathShape.d).toMatch(/^M/);
  expect(pathShape.length).toBeGreaterThan(0);
  expect(pathShape.backwards, pathShape.d).toBe(false);
  await page.locator('#end').click();
  await expect(page.locator('#chart path.sl-line')).toHaveAttribute('stroke-width', '6');
  await expect(page.locator('#chart circle.sl-line-point').first()).toHaveAttribute('r', '7');
});

test('line filter keeps an internal gap while focus keeps every observation', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#filter');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Remove points');
  await page.locator('#end').click();
  await expect(page.locator('#chart circle.sl-line-point')).toHaveCount(4);
  await expect(page.locator('#chart path.sl-line')).toHaveCount(2);

  await page.locator('#scenario').selectOption('focus');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Focus view');
  await page.locator('#end').click();
  await expect(page.locator('#chart circle.sl-line-point')).toHaveCount(6);
  await expect(page.locator('#chart path.sl-line')).toHaveCount(1);
});

test('line lab names the authored observation direction', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#restore');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Add points');
  await page.locator('#scenario').selectOption('add');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Add points');
  await page.locator('#scenario').selectOption('remove');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Remove points');
});

test('all exact D3 curve names render through the Line module', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const results = await page.evaluate(async () => {
    const [{ line, D3_CURVE_NAMES }, { transition }] = await Promise.all([
      import('/dist/line.js'),
      import('/dist/transition-entry.js')
    ]);
    const rows = [
      { period: 'Q1', value: 10 },
      { period: 'Q2', value: 24 },
      { period: 'Q3', value: 17 },
      { period: 'Q4', value: 31 },
      { period: 'Q5', value: 22 },
      { period: 'Q6', value: 38 }
    ];
    const base = line(rows).x('period').y('value').key('period');
    const output = [];
    for (const name of D3_CURVE_NAMES) {
      const target = document.createElement('div');
      document.body.append(target);
      const change = await transition(base, base.curve(name), { target, d3, aq, height: 320 });
      change.progress(0.5);
      const path = target.querySelector('path.sl-line');
      output.push({
        name,
        d: path?.getAttribute('d') || '',
        length: path?.getTotalLength() || 0
      });
      change.destroy();
      target.remove();
    }
    return output;
  });

  expect(results).toHaveLength(20);
  for (const result of results) {
    expect(result.d, result.name).toMatch(/^M/);
    expect(result.length, result.name).toBeGreaterThan(0);
  }
});

test('line flip changes x before y', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#flip');
  await ready(page);
  const positions = async () => page.locator('#chart circle.sl-line-point').evaluateAll(nodes =>
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

test('line time window uses the keyed shift plan without a path wiggle', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#shift');
  await ready(page);
  await expect(page.locator('.playground-line-plan')).toContainText('Shift window');
  const startLeft = await page.locator('#chart path.sl-line').evaluate(node => {
    const point = node.getPointAtLength(0);
    return point.x;
  });
  await page.locator('#progress').fill('0.5');
  const result = await page.locator('#chart path.sl-line').evaluate(node => {
    const length = node.getTotalLength();
    const points = Array.from({ length: 121 }, (_, index) =>
      node.getPointAtLength(length * index / 120));
    return {
      strategy: node.getAttribute('data-line-transition'),
      left: Math.min(...points.map(point => point.x)),
      right: Math.max(...points.map(point => point.x)),
      backwards: points.some((point, index) => index > 0 && point.x < points[index - 1].x - 0.5),
      circles: [...node.parentElement.querySelectorAll('circle.sl-line-point')].map(point => ({
        key: point.getAttribute('data-key'),
        x: Number(point.getAttribute('cx'))
      }))
    };
  });

  expect(result.strategy).toBe('shift-window');
  expect(result.left).toBeLessThan(startLeft);
  expect(result.right).toBeGreaterThan(0);
  expect(result.backwards).toBe(false);
  expect(Math.abs(result.circles.find(point => point.key === 'Q1').x - result.left)).toBeLessThan(1);
  expect(Math.abs(result.circles.find(point => point.key === 'Q7').x - result.right)).toBeLessThan(1);
});

test('line add and remove are the same transition in reverse', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const result = await page.evaluate(async () => {
    const [{ line }, { transition }] = await Promise.all([
      import('/dist/line.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="add"></div><div id="remove"></div>';
    const rows = [
      { id: 'Q1', period: 'Q1', sales: 28 },
      { id: 'Q2', period: 'Q2', sales: 47 },
      { id: 'Q3', period: 'Q3', sales: 39 },
      { id: 'Q4', period: 'Q4', sales: 66 },
      { id: 'Q5', period: 'Q5', sales: 58 },
      { id: 'Q6', period: 'Q6', sales: 79 }
    ];
    const base = line(rows).x('period').y('sales').key('id');
    const withQ7 = base.data([...rows, { id: 'Q7', period: 'Q7', sales: 88 }]);
    const options = target => ({ target, d3, aq, height: 360 });
    const add = await transition(base, withQ7, options('#add'));
    const remove = await transition(withQ7, base, options('#remove'));
    const geometryNumber = value => value == null ? null : value.replace(
      /-?\d*\.?\d+(?:e[-+]?\d+)?/gi,
      number => String(Math.round(Number(number) * 1e9) / 1e9)
    );
    const geometry = selector => [...document.querySelectorAll(
      `${selector} path.sl-line, ${selector} circle.sl-line-point, ` +
      `${selector} .sl-x-axis .tick, ${selector} .sl-y-axis .tick`
    )].map(node => ({
      tag: node.tagName,
      className: node.getAttribute('class'),
      key: node.getAttribute('data-key'),
      text: node.textContent,
      d: geometryNumber(node.getAttribute('d')),
      cx: geometryNumber(node.getAttribute('cx')),
      cy: geometryNumber(node.getAttribute('cy')),
      r: geometryNumber(node.getAttribute('r')),
      transform: geometryNumber(node.getAttribute('transform')),
      opacity: node.style.opacity,
      dash: geometryNumber(node.getAttribute('stroke-dasharray')),
      offset: geometryNumber(node.getAttribute('stroke-dashoffset'))
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

    const frames = [0, 0.2, 0.5, 0.69, 0.8, 1].map(progress => {
      add.progress(progress);
      remove.progress(1 - progress);
      return { add: geometry('#add'), remove: geometry('#remove') };
    });

    add.progress(0.69);
    const beforePoint = {
      radius: Number(document.querySelector('#add circle[data-key="Q7"]')?.getAttribute('r')),
      path: document.querySelector('#add path.sl-line')?.getAttribute('d')
    };
    add.progress(0.8);
    const afterLine = {
      radius: Number(document.querySelector('#add circle[data-key="Q7"]')?.getAttribute('r')),
      path: document.querySelector('#add path.sl-line')?.getAttribute('d')
    };
    add.progress(0);
    const startPath = document.querySelector('#add path.sl-line')?.getAttribute('d');
    return { frames, beforePoint, afterLine, startPath };
  });

  for (const frame of result.frames) expect(frame.remove).toEqual(frame.add);
  expect(result.beforePoint.radius).toBe(0);
  expect(result.beforePoint.path).not.toBe(result.startPath);
  expect(result.afterLine.radius).toBeGreaterThan(0);
  expect(result.afterLine.path).toBe(result.frames.at(-1).add.find(item => item.tag === 'path')?.d);
});

test('line filter and restore are the same transition in reverse', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const result = await page.evaluate(async () => {
    const [{ line }, { transition }] = await Promise.all([
      import('/dist/line.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="filter"></div><div id="restore"></div>';
    const rows = [
      { id: 'Q1', period: 'Q1', sales: 28 },
      { id: 'Q2', period: 'Q2', sales: 47 },
      { id: 'Q3', period: 'Q3', sales: 39 },
      { id: 'Q4', period: 'Q4', sales: 66 },
      { id: 'Q5', period: 'Q5', sales: 58 },
      { id: 'Q6', period: 'Q6', sales: 79 }
    ];
    const base = line(rows).x('period').y('sales').key('id');
    const filtered = base
      .where({ field: 'id', oneOf: ['Q1', 'Q2', 'Q5', 'Q6'] })
      .connect('adjacent');
    const options = target => ({ target, d3, aq, height: 360 });
    const filter = await transition(base, filtered, options('#filter'));
    const restore = await transition(filtered, base, options('#restore'));
    const geometryNumber = value => value == null ? null : value.replace(
      /-?\d*\.?\d+(?:e[-+]?\d+)?/gi,
      number => String(Math.round(Number(number) * 1e9) / 1e9)
    );
    const geometry = selector => [...document.querySelectorAll(
      `${selector} path.sl-line, ${selector} circle.sl-line-point`
    )].map(node => ({
      tag: node.tagName,
      key: node.getAttribute('data-key'),
      d: geometryNumber(node.getAttribute('d')),
      cx: geometryNumber(node.getAttribute('cx')),
      cy: geometryNumber(node.getAttribute('cy')),
      r: geometryNumber(node.getAttribute('r')),
      opacity: node.style.opacity,
      dash: geometryNumber(node.getAttribute('stroke-dasharray')),
      offset: geometryNumber(node.getAttribute('stroke-dashoffset'))
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

    const frames = [0, 0.2, 0.5, 0.69, 0.8, 1].map(progress => {
      filter.progress(progress);
      restore.progress(1 - progress);
      return { filter: geometry('#filter'), restore: geometry('#restore') };
    });
    const removalFrame = progress => {
      filter.progress(progress);
      return {
        radius: Number(document.querySelector('#filter circle[data-key="Q3"]')?.getAttribute('r')),
        lineOffset: Number(document.querySelector('#filter path[data-key="__line"]')?.getAttribute('stroke-dashoffset'))
      };
    };
    return { frames, pointIsLeaving: removalFrame(0.25), lineIsRetracting: removalFrame(0.35) };
  });

  for (const frame of result.frames) expect(frame.restore).toEqual(frame.filter);
  expect(result.pointIsLeaving.radius).toBeGreaterThan(0);
  expect(result.pointIsLeaving.lineOffset).toBe(0);
  expect(result.lineIsRetracting.radius).toBe(0);
  expect(result.lineIsRetracting.lineOffset).toBeGreaterThan(0);
});

test('line split and merge are one transition in reverse', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const frames = await page.evaluate(async () => {
    const [{ line }, { transition }] = await Promise.all([
      import('/dist/line.js'),
      import('/dist/transition-entry.js')
    ]);
    document.body.innerHTML = '<div id="split"></div><div id="merge"></div>';
    const rows = [
      { period: 'Q1', region: 'North', sales: 18 },
      { period: 'Q1', region: 'South', sales: 10 },
      { period: 'Q2', region: 'North', sales: 29 },
      { period: 'Q2', region: 'South', sales: 18 },
      { period: 'Q3', region: 'North', sales: 22 },
      { period: 'Q3', region: 'South', sales: 17 }
    ];
    const detailed = line(rows).x('period').y('sales').key(['period', 'region'])
      .breakdown('region', { color: ['#1c6ae4', '#fa4d1d'] });
    const total = detailed.rollup({ op: 'sum' });
    const options = target => ({ target, d3, aq, height: 360 });
    const split = await transition(total, detailed, options('#split'));
    const merge = await transition(detailed, total, options('#merge'));
    const geometry = selector => [...document.querySelectorAll(`${selector} path.sl-line, ${selector} circle.sl-line-point`)]
      .map(node => ({
        tag: node.tagName,
        key: node.getAttribute('data-key'),
        d: node.getAttribute('d'),
        cx: node.getAttribute('cx'),
        cy: node.getAttribute('cy'),
        opacity: node.style.opacity
      }))
      .sort((a, b) => `${a.tag}${a.key}`.localeCompare(`${b.tag}${b.key}`));
    return [0, 0.17, 0.5, 0.81, 1].map(progress => {
      split.progress(progress);
      merge.progress(1 - progress);
      return { split: geometry('#split'), merge: geometry('#merge') };
    });
  });
  for (const frame of frames) expect(frame.merge).toEqual(frame.split);
});

test('line split cuts first, moves second, and connects last', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#split');
  await ready(page);

  await page.locator('#progress').fill('0.24');
  await expect(page.locator('#chart path.sl-line[data-line-stage="segments"]')).toHaveCount(2);
  const cutPositions = await page.locator('#chart circle.sl-line-point[data-key*="|"]').evaluateAll(nodes =>
    nodes.map(node => ({ key: node.getAttribute('data-key'), y: Number(node.getAttribute('cy')) })));
  const byPeriod = new Map();
  for (const point of cutPositions) {
    const period = point.key.split('|')[0];
    if (!byPeriod.has(period)) byPeriod.set(period, []);
    byPeriod.get(period).push(point.y);
  }
  for (const values of byPeriod.values()) expect(new Set(values).size).toBe(1);

  await page.locator('#progress').fill('0.58');
  await expect(page.locator('#chart path.sl-line[data-line-stage="segments"]')).toHaveCount(2);
  const movedPositions = await page.locator('#chart circle.sl-line-point[data-key*="|"]').evaluateAll(nodes =>
    nodes.map(node => ({ key: node.getAttribute('data-key'), y: Number(node.getAttribute('cy')) })));
  expect(movedPositions.map(point => point.y)).not.toEqual(cutPositions.map(point => point.y));

  await page.locator('#progress').fill('0.92');
  await expect(page.locator('#chart path.sl-line[data-line-stage="connected"]')).toHaveCount(2);
});

test('line lab fits a narrow viewport and keeps progress after resize', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/line-lab.html#split');
  await ready(page);
  await page.locator('#progress').fill('0.37');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#value')).toHaveText('0.37');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
