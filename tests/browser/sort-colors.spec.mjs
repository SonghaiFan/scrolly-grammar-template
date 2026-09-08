import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/examples/transition/#sort');
  await expect(page.locator('#status')).toHaveText('Ready');
});

for (const mode of ['undeclared', 'field', 'range', 'domain', 'stacked', 'grouped', 'reconstruct']) {
  test(`sort preserves keyed colors and legend: ${mode}`, async ({ page }) => {
    const result = await page.evaluate(async mode => {
      const { bar, transition } = await import('/dist/scrollylite.esm.js');
      const segmented = ['stacked', 'grouped'].includes(mode);
      const rows = segmented ? [
        { category: 'A', value: 10, type: 'one' },
        { category: 'A', value: 20, type: 'two' },
        { category: 'B', value: 30, type: 'two' },
        { category: 'B', value: 15, type: 'one' }
      ] : [
        { category: 'A', value: 10, type: 'one' },
        { category: 'B', value: 30, type: 'two' },
        { category: 'C', value: 20, type: 'one' }
      ];
      let from = bar(rows).x('category').y('value').key('category');
      if (mode === 'field') from = from.color('type');
      if (mode === 'range') from = from.color('type', { range: ['#2355aa', '#aa5523'] });
      if (mode === 'domain') from = from.color('type', { domain: ['two', 'one'], range: ['#2355aa', '#aa5523'] });
      if (segmented) from = from.breakdown('type');
      if (mode === 'grouped') from = from.layout('grouped');
      const host = document.createElement('div');
      host.style.width = '800px';
      document.body.append(host);
      const change = await transition(from, from.sort('value', 'descending'), {
        target: host, d3, aq, height: 400, reconstruct: mode === 'reconstruct'
      });
      const read = () => {
        const nodes = [...host.querySelectorAll('rect.sl-bar')];
        return {
          bars: nodes.map(node => ({
            key: node.dataset.key, category: node.dataset.category,
            value: node.__data__.value,
            fill: d3.color(getComputedStyle(node).fill).formatHex(),
            y: Number(node.getAttribute('y')), height: Number(node.getAttribute('height'))
          })).sort((a, b) => a.key.localeCompare(b.key)),
          order: nodes.map(node => ({ key: node.dataset.category, x: Number(node.getAttribute('x')) }))
            .sort((a, b) => a.x - b.x).map(node => node.key),
          legend: [...host.querySelectorAll('.sl-legend-item')].map(node => ({
            text: node.querySelector('text').textContent,
            fill: d3.color(getComputedStyle(node.querySelector('rect')).fill).formatHex(),
            position: node.getAttribute('transform')
          }))
        };
      };
      const initial = read();
      const samples = [];
      for (const p of [0.2, 0.5, 1, 0.8, 0, 0.37, 1]) {
        change.progress(p);
        samples.push(read());
      }
      host.style.width = '600px';
      change.resize();
      const resized = read();
      change.destroy();
      host.remove();
      return { initial, samples, resized, segmented };
    }, mode);

    for (const sample of result.samples) {
      expect(sample.bars).toEqual(result.initial.bars);
      expect(sample.legend).toEqual(result.initial.legend);
    }
    expect(result.resized.bars).toEqual(result.initial.bars);
    // Legend offsets depend on margins, not on the category-axis sort order.
    expect(result.resized.legend).toEqual(result.initial.legend);
    if (!result.segmented) {
      expect(result.initial.order).toEqual(['A', 'B', 'C']);
      expect(result.samples.at(-1).order).toEqual(['B', 'C', 'A']);
    }
    if (mode === 'domain') {
      expect(result.initial.legend.map(item => item.text)).toEqual(['two', 'one']);
      expect(result.initial.bars.find(bar => bar.category === 'B').fill).toBe('#2355aa');
    }
  });
}

test('explicit color changes are still allowed during sorting', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { bar, transition } = await import('/dist/scrollylite.esm.js');
    const from = bar([
      { category: 'A', value: 10, type: 'one' },
      { category: 'B', value: 30, type: 'two' }
    ]).x('category').y('value').key('category')
      .color('type', { domain: ['one', 'two'], range: ['#336699', '#cc6633'] });
    const to = from.sort('value', 'descending')
      .color('type', { domain: ['one', 'two'], range: ['#cc6633', '#336699'] });
    const host = document.createElement('div');
    document.body.append(host);
    const change = await transition(from, to, { target: host, d3, aq, height: 400 });
    const read = () => Object.fromEntries([...host.querySelectorAll('rect.sl-bar')]
      .map(node => [node.dataset.category, d3.color(node.getAttribute('fill')).formatHex()]));
    const start = read();
    change.progress(1);
    const end = read();
    change.destroy();
    host.remove();
    return { start, end };
  });
  expect(result.start).toEqual({ A: '#336699', B: '#cc6633' });
  expect(result.end).toEqual({ A: '#cc6633', B: '#336699' });
});

test('sort lab keeps the same colors at both endpoints', async ({ page }) => {
  const read = () => page.locator('#chart rect.sl-bar').evaluateAll(nodes => Object.fromEntries(
    nodes.map(node => [node.dataset.category, {
      fill: window.d3.color(node.getAttribute('fill')).formatHex(),
      height: node.getAttribute('height')
    }])
  ));
  const before = await read();
  await page.locator('#end').click();
  expect(await read()).toEqual(before);
  await page.screenshot({ path: 'test-results/sort-colors-fixed.png', fullPage: true });
});

test('undeclared color uses one fill and no legend; split demo declares segment color', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { bar, transition } = await import('/dist/scrollylite.esm.js');
    const rows = [
      { category: 'A', value: 10, type: 'one' },
      { category: 'B', value: 20, type: 'two' }
    ];
    const host = document.createElement('div');
    document.body.append(host);
    const plain = bar(rows).x('category').y('value').key('category');
    const change = await transition(plain, plain.sort('value', 'descending'), { target: host, d3, aq, height: 400 });
    const fills = [...host.querySelectorAll('rect.sl-bar')]
      .map(node => d3.color(getComputedStyle(node).fill).formatHex());
    const legends = host.querySelectorAll('.sl-legend-item').length;
    change.destroy();

    const detailed = bar([
      { category: 'A', value: 10, type: 'one' },
      { category: 'A', value: 20, type: 'two' },
      { category: 'B', value: 30, type: 'one' },
      { category: 'B', value: 15, type: 'two' }
    ]).x('category').y('value').key('category').breakdown('type');
    const split = await transition(detailed.rollup(), detailed, { target: host, d3, aq, height: 400 });
    split.progress(1);
    const splitFills = [...host.querySelectorAll('rect.sl-bar')]
      .map(node => d3.color(getComputedStyle(node).fill).formatHex());
    const splitLegends = host.querySelectorAll('.sl-legend-item').length;
    const segments = host.querySelectorAll('rect.sl-bar-segment').length;
    split.destroy(); host.remove();
    return { fills, legends, splitFills, splitLegends, segments };
  });
  expect(new Set(result.fills).size).toBe(1);
  expect(result.fills[0]).toBe('#000000');
  expect(result.legends).toBe(0);
  expect(new Set(result.splitFills).size).toBe(1);
  expect(result.splitFills[0]).toBe('#000000');
  expect(result.splitLegends).toBe(0);
  expect(result.segments).toBe(4);

  await page.locator('#scenario').selectOption('split');
  await expect(page.locator('#status')).toHaveText('Ready');
  await expect(page.locator('#editor')).toHaveValue(/\.color\("type"\)/);
  await page.locator('#end').click();
  await expect(page.locator('#chart .sl-legend-item')).toHaveCount(2);
  const segmentFills = await page.locator('#chart rect.sl-bar').evaluateAll(nodes =>
    nodes.map(node => getComputedStyle(node).fill));
  expect(new Set(segmentFills).size).toBe(2);
});

test('stacked split cuts at final segment bounds, then reveals color over the parent', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { bar, transition } = await import('/dist/scrollylite.esm.js');
    const rows = [
      { category: 'A', value: 10, type: 'one' },
      { category: 'A', value: 20, type: 'two' },
      { category: 'B', value: 30, type: 'one' },
      { category: 'B', value: 15, type: 'two' }
    ];
    const host = document.createElement('div');
    host.style.width = '800px';
    document.body.append(host);
    const plain = bar(rows).x('category').y('value').key('category').breakdown('type');
    const colored = plain.color('type', {
      domain: ['one', 'two'],
      range: ['#336699', '#ee8822']
    });
    const change = await transition(colored.rollup(), colored, { target: host, d3, aq, height: 400 });

    const readSegments = () => [...host.querySelectorAll('rect.sl-bar-segment')]
      .map(node => {
        const style = getComputedStyle(node);
        return {
          key: node.dataset.key,
          x: Number(node.getAttribute('x')),
          y: Number(node.getAttribute('y')),
          width: Number(node.getAttribute('width')),
          height: Number(node.getAttribute('height')),
          fillOpacity: Number(style.fillOpacity),
          opacity: Number(style.opacity)
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    change.progress(0.25);
    const reveal = readSegments();
    const underlay = [...host.querySelectorAll('rect.sl-bar:not(.sl-bar-segment)')].map(node => ({
      category: node.dataset.category,
      opacity: Number(getComputedStyle(node).opacity)
    }));
    const seam = [...host.querySelectorAll('path.sl-bar-seam')].map(node => {
      const style = getComputedStyle(node);
      const length = node.getTotalLength();
      return {
        opacity: Number(style.opacity),
        width: style.strokeWidth,
        blend: style.mixBlendMode,
        length
      };
    });
    change.progress(1);
    const end = readSegments();
    const endSeam = [...host.querySelectorAll('path.sl-bar-seam')].map(node => ({ length: node.getTotalLength() }));
    change.destroy();

    const monochrome = await transition(plain.rollup(), plain, { target: host, d3, aq, height: 400 });
    monochrome.progress(0.5);
    const noColor = [...host.querySelectorAll('rect.sl-bar-segment')].map(node => {
      const style = getComputedStyle(node);
      return {
        fill: d3.color(style.fill)?.formatHex() || style.fill
      };
    });
    const noColorSeams = host.querySelectorAll('path.sl-bar-seam').length;
    monochrome.destroy();
    host.remove();
    return { reveal, underlay, seam, end, endSeam, noColor, noColorSeams };
  });

  expect(result.reveal).toHaveLength(4);
  expect(result.reveal.map(({ key, x, y, width, height }) => ({ key, x, y, width, height })))
    .toEqual(result.end.map(({ key, x, y, width, height }) => ({ key, x, y, width, height })));
  expect(result.reveal.every(mark => mark.fillOpacity === 1)).toBe(true);
  expect(result.reveal.every(mark => mark.opacity > 0 && mark.opacity < 1)).toBe(true);
  expect(result.underlay).toHaveLength(2);
  expect(result.underlay.every(mark => mark.opacity > 0 && mark.opacity < 1)).toBe(true);
  expect(result.seam).toHaveLength(1);
  expect(result.seam.every(line => line.opacity === 1 && line.width === '1px' && line.blend === 'difference')).toBe(true);
  result.seam.forEach((line, index) => {
    const end = result.endSeam[index];
    expect(line.length).toBeGreaterThan(0);
    expect(line.length).toBeLessThan(end.length);
  });
  expect(result.noColor.every(mark => mark.fill === '#000000')).toBe(true);
  expect(result.noColorSeams).toBe(1);
});
