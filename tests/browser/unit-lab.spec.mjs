import { test, expect } from '@playwright/test';
import { scenarios } from '../../examples/unit/scenarios.js';

const ready = async page => {
  await page.locator('#chart').scrollIntoViewIfNeeded();
  await expect(page.locator('#status')).toHaveText('Ready');
};

const snapshot = page => page.locator('#chart svg').evaluate(svg =>
  Array.from(svg.querySelectorAll('circle.sl-unit, .tick, .sl-legend-item')).map(node => ({
    tag: node.tagName,
    text: node.textContent,
    attrs: Array.from(node.attributes).map(attr => [attr.name, attr.value]).sort(),
    opacity: node.style.opacity
  })));

for (const sample of scenarios) {
  test(`unit lab ${sample.id}: editable pair and reproducible seek`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/docs/.vitepress/dist/unit-lab.html#${sample.id}`);
    await ready(page);
    await expect(page.locator('#scenario option')).toHaveCount(scenarios.length);
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

    await editor.fill(sample.code.replace('radius: 6', 'radius: 5'));
    await expect(page.locator('#status')).toHaveText('Waiting for input');
    await ready(page);
    await expect(editor).toHaveValue(/radius: 5/);
    await page.locator('#reset').click();
    await ready(page);
    await expect(editor).toHaveValue(sample.code);
    expect(errors).toEqual([]);
  });
}

test('unit bar uses category position while every unit keeps equal size', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/unit-lab.html#bar');
  await ready(page);
  await page.locator('#end').click();

  await expect(page.locator('#chart circle.sl-unit')).toHaveCount(150);
  await expect(page.locator('#chart .sl-x-axis .tick')).toHaveCount(3);
  const result = await page.locator('#chart').evaluate(chart => {
    const marks = [...chart.querySelectorAll('circle.sl-unit')].map(node => ({
      group: node.dataset.groupKey,
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy')),
      r: Number(node.getAttribute('r'))
    }));
    const groups = Object.groupBy(marks, mark => mark.group);
    return {
      radii: [...new Set(marks.map(mark => mark.r))],
      groupCenters: Object.values(groups).map(group =>
        group.reduce((sum, mark) => sum + mark.x, 0) / group.length),
      groupYCounts: Object.values(groups).map(group => new Set(group.map(mark => mark.y)).size),
      labels: [...chart.querySelectorAll('.sl-x-axis .tick')].map(node => node.textContent)
    };
  });

  expect(result.radii).toHaveLength(1);
  expect(new Set(result.groupCenters).size).toBe(3);
  expect(result.groupYCounts.every(count => count > 1)).toBe(true);
  expect(result.labels).toEqual(['setosa', 'versicolor', 'virginica']);
});

test('Unit bar sets horizontal positions before units fall', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/unit-lab.html#bar');
  await ready(page);
  const geometry = () => page.locator('#chart circle.sl-unit').evaluateAll(nodes =>
    Object.fromEntries(nodes.map(node => [node.dataset.key, {
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy'))
    }])));

  const start = await geometry();
  await page.locator('#progress').fill('0.52');
  const afterMoveAcross = await geometry();
  const steps = await page.locator('#chart [data-transition-steps]').first()
    .getAttribute('data-transition-steps');
  await page.locator('#end').click();
  const end = await geometry();

  expect(Object.keys(afterMoveAcross)).toEqual(Object.keys(start));
  for (const key of Object.keys(start)) {
    expect(afterMoveAcross[key].x).toBeCloseTo(end[key].x, 5);
    expect(afterMoveAcross[key].y).toBeCloseTo(start[key].y, 5);
  }
  expect(steps).toBe('view move-across fall');
});

test('Unit fall uses the direction inferred from successive progress values', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/unit-lab.html#beeswarm');
  await ready(page);
  const progress = page.locator('#progress');
  const positions = () => page.locator('#chart circle.sl-unit').evaluateAll(nodes =>
    nodes.map(node => Number(node.getAttribute('cy'))));

  await progress.fill('0.7');
  await progress.fill('0.8');
  const arrivingForward = await positions();

  await progress.fill('0.9');
  await progress.fill('0.8');
  const arrivingBackward = await positions();

  expect(arrivingBackward).not.toEqual(arrivingForward);
});

test('Unit uses a light bounded per-mark delay by default', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/unit-lab.html#radius');
  await ready(page);
  await page.locator('#progress').fill('0.5');

  const radii = await page.locator('#chart circle.sl-unit').evaluateAll(nodes =>
    nodes.map(node => Number(node.getAttribute('r')).toFixed(4)));
  expect(new Set(radii).size).toBeGreaterThan(1);
});

test('unit focus keeps every unit and uses the shared 2D camera', async ({ page }) => {
  await page.goto('/docs/.vitepress/dist/unit-lab.html#focus');
  await ready(page);
  await page.locator('#end').click();

  await expect(page.locator('#chart circle.sl-unit')).toHaveCount(150);
  const result = await page.locator('#chart svg').evaluate(svg => {
    const plot = svg.querySelector('clipPath[id^="sl-mark-clip-"] rect');
    const selected = [...svg.querySelectorAll('circle.sl-unit')]
      .find(node => node.__data__?.flowerId === 'iris-001');
    return {
      width: Number(plot?.getAttribute('width')),
      height: Number(plot?.getAttribute('height')),
      cx: Number(selected?.getAttribute('cx')),
      cy: Number(selected?.getAttribute('cy')),
      radius: Number(selected?.getAttribute('r')),
      cameraK: Number(svg.getAttribute('data-camera-k'))
    };
  });
  expect(result.cameraK).toBeGreaterThan(1);
  expect(result.cx).toBeCloseTo(result.width / 2, 5);
  expect(result.cy).toBeCloseTo(result.height / 2, 5);
  expect(result.radius).toBeCloseTo(Math.min(result.width, result.height) / 2, 5);
});

test('unit lab loads the tidy Iris data and keeps one keyed unit per flower', async ({ page }) => {
  const dataRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/data/iris.csv')) dataRequests.push(request.url());
  });
  await page.goto('/docs/.vitepress/dist/unit-lab.html#all');
  await ready(page);
  await page.locator('#end').click();

  await expect(page.locator('#chart circle.sl-unit')).toHaveCount(150);
  expect(dataRequests.length).toBeGreaterThan(0);
  const result = await page.locator('#chart').evaluate(chart => {
    const marks = [...chart.querySelectorAll('circle.sl-unit')];
    return {
      keys: new Set(marks.map(node => node.dataset.key)).size,
      parentKeys: new Set(marks.map(node => node.dataset.parentKey)).size,
      species: [...new Set(marks.map(node => node.__data__?.species))].sort()
    };
  });

  expect(result.keys).toBe(150);
  expect(result.parentKeys).toBe(150);
  expect(result.species).toEqual(['setosa', 'versicolor', 'virginica']);
});

test('zero count renders zero units and group does not silently choose layout or color', async ({ page }) => {
  await page.goto('/tests/fixtures/runtime.html');
  const result = await page.evaluate(async () => {
    const [{ unit }, { transition }] = await Promise.all([
      import('/dist/unit.js'),
      import('/dist/transition-entry.js')
    ]);
    const rows = [
      { id: 'zero', category: 'A', count: 0 },
      { id: 'three', category: 'B', count: 3 }
    ];
    const grouped = unit(rows).value('count').key('id').group('category');
    const change = await transition(grouped, grouped, {
      target: document.body.appendChild(document.createElement('div')),
      d3, aq, height: 320
    });
    change.progress(1);
    const spec = grouped.toSpec();
    return {
      marks: document.querySelectorAll('circle.sl-unit').length,
      zeroMarks: document.querySelectorAll('[data-parent-key="zero"]').length,
      layout: spec.meta.state.sceneState.axis.layout,
      group: spec.meta.state.sceneState.axis.group,
      color: spec.encoding?.color,
      hasRollup: typeof grouped.rollup,
      hasBreakdown: typeof grouped.breakdown
    };
  });

  expect(result.marks).toBe(3);
  expect(result.zeroMarks).toBe(0);
  expect(result.layout).toBe('grid');
  expect(result.group).toBe('category');
  expect(result.color).toBeUndefined();
  expect(result.hasRollup).toBe('undefined');
  expect(result.hasBreakdown).toBe('undefined');
});

test('a Unit transition does not import another chart module', async ({ page }) => {
  const modules = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.includes('/dist/charts/')) modules.push(path);
  });
  await page.goto('/tests/fixtures/isolated.html');
  await page.evaluate(async () => {
    const [{ unit }, { transition }] = await Promise.all([
      import('/dist/unit.js'),
      import('/dist/transition-entry.js')
    ]);
    const rows = [
      { id: 'A', team: 'Alpha', count: 2 },
      { id: 'B', team: 'Beta', count: 3 }
    ];
    const from = unit(rows).value('count').key('id');
    const to = from.group('team').layout('bar', { columns: 2 });
    const pair = await transition(from, to, { target: '#chart', d3, aq, height: 240 });
    pair.progress(0.5);
  });

  expect(modules.some(path => path.includes('/charts/unit/'))).toBe(true);
  expect(modules.filter(path => /\/charts\/(area|bar|line|point)\//.test(path))).toEqual([]);
});

test('grid reflow stages the view, preserves keyed identity, and uses the same path backward', async ({ page }) => {
  await page.goto('/tests/fixtures/isolated.html');
  const result = await page.evaluate(async () => {
    const [{ unit }, { transition }] = await Promise.all([
      import('/dist/unit.js'),
      import('/dist/transition-entry.js')
    ]);
    const rows = Array.from({ length: 12 }, (_, index) => ({ id: `U${index + 1}` }));
    const narrow = unit(rows).key('id').layout('grid', { columns: 3, radius: 8 })
      .transition({ duration: 1000, ease: 'linear' });
    const wide = narrow.layout('grid', { columns: 4, radius: 8 });
    const forwardHost = document.querySelector('#chart');
    const reverseHost = document.body.appendChild(document.createElement('div'));
    const forward = await transition(narrow, wide, { target: forwardHost, d3, aq, height: 320 });
    const reverse = await transition(wide, narrow, { target: reverseHost, d3, aq, height: 320 });

    const geometry = host => [...host.querySelectorAll('circle.sl-unit')]
      .map(node => [
        Number(node.getAttribute('cx')).toFixed(3),
        Number(node.getAttribute('cy')).toFixed(3),
        Number(node.getAttribute('r')).toFixed(3)
      ].join('|')).sort();
    forward.progress(0);
    const sourceGeometry = geometry(forwardHost);
    forward.progress(1);
    forward.progress(0.15);
    const viewStageGeometry = geometry(forwardHost);
    forward.progress(0.5);
    const assignments = [...forwardHost.querySelectorAll('circle.sl-unit')].map(node => ({
      source: node.dataset.sourceKey,
      target: node.dataset.key
    }));
    forward.progress(0.37);
    reverse.progress(0.63);
    return {
      sourceGeometry,
      viewStageGeometry,
      keyedIdentityPreserved: assignments.every(match => match.source === match.target),
      matchedByKey: [...forwardHost.querySelectorAll('circle.sl-unit')]
        .every(node => node.dataset.matchedBy === 'key'),
      reverseMatches: JSON.stringify(geometry(forwardHost)) === JSON.stringify(geometry(reverseHost)),
      steps: forward.view.dataset.transitionSteps
    };
  });

  expect(result.viewStageGeometry).toEqual(result.sourceGeometry);
  expect(result.keyedIdentityPreserved).toBe(true);
  expect(result.matchedByKey).toBe(true);
  expect(result.reverseMatches).toBe(true);
  expect(result.steps).toBe('view marks');
});

test('Unit regroup is one staged transition evaluated in opposite directions', async ({ page }) => {
  await page.goto('/tests/fixtures/isolated.html');
  const sameFrame = await page.evaluate(async () => {
    const [{ unit }, { transition }] = await Promise.all([
      import('/dist/unit.js'),
      import('/dist/transition-entry.js')
    ]);
    const rows = [
      { id: 'A1', team: 'Alpha', region: 'North', count: 5 },
      { id: 'A2', team: 'Alpha', region: 'South', count: 4 },
      { id: 'B1', team: 'Beta', region: 'North', count: 6 },
      { id: 'B2', team: 'Beta', region: 'South', count: 3 }
    ];
    const base = unit(rows).value('count').key('id')
      .transition({ duration: 1000, ease: 'linear' });
    const byTeam = base.group('team').layout('bar', { columns: 3 }).color('team');
    const byRegion = base.group('region').layout('bar', { columns: 3 }).color('region');
    const forwardHost = document.querySelector('#chart');
    const reverseHost = document.body.appendChild(document.createElement('div'));
    const forward = await transition(byTeam, byRegion, { target: forwardHost, d3, aq, height: 320 });
    const reverse = await transition(byRegion, byTeam, { target: reverseHost, d3, aq, height: 320 });
    forward.progress(0.41);
    reverse.progress(0.59);
    const frame = host => [...host.querySelectorAll('circle.sl-unit')].map(node => ({
      cx: Number(node.getAttribute('cx')).toFixed(3),
      cy: Number(node.getAttribute('cy')).toFixed(3),
      r: Number(node.getAttribute('r')).toFixed(3),
      fill: node.getAttribute('fill'),
      opacity: node.style.opacity
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify(frame(forwardHost)) === JSON.stringify(frame(reverseHost));
  });

  expect(sameFrame).toBe(true);
});
