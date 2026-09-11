// @ts-nocheck — complex layout algorithms with D3-style scale patterns
import { matchesFilter } from '../../data/filter.js';
import { diffViewStates } from '../../grammar/diff.js';
import { specObjectKey, specState, specTransition, specUnit } from '../../spec-meta.js';
import { defaultTransition } from '../../timing.js';

const UNIT_LAYOUT_ORDER = ['grid', 'bar', 'timeline', 'dodge'];
const VIEW_STAGE_RATIO = 0.28;
const TRAVEL_STAGE_RATIO = 0.18;

export function expandUnits(rows, spec, d3) {
  const unit = specUnit(spec) || {};
  const valueKey = unit.value;
  const rowKey = unit.key || specObjectKey(spec) || 'id';
  const maxUnits = positiveInteger(unit.maxUnits, 240);
  const units = [];

  rows.forEach((row, rowIndex) => {
    const rawCount = valueKey ? Number(row[valueKey]) : 1;
    const count = Math.max(0, Math.round(Number.isFinite(rawCount) ? rawCount : 0));
    Array.from({ length: count }, (_, unitIndex) => {
      units.push({
        ...row,
        __row: row,
        __unitIndex: unitIndex,
        __rowIndex: rowIndex,
        __parentKey: String(row[rowKey] ?? rowIndex),
        __unitKey: `${String(row[rowKey] ?? rowIndex)}\u0000${unitIndex}`
      });
    });
  });

  return units.slice(0, maxUnits);
}

export function unitLayout(units, chart, spec, deps) {
  const { bandOrLinear, d3, drawGrid, drawXAxis, drawYAxis, position, updateGrid } = deps;
  const unit = specUnit(spec) || {};
  const layout = unit.layout || 'grid';
  const columns = positiveInteger(unit.columns, Math.max(8, Math.floor(Math.sqrt(units.length) * 1.4)));
  const requestedRadius = positiveNumber(unit.radius, 12);
  const xChannel = spec.encoding?.x || null;
  const groupKey = unit.group || null;
  const xKey = xChannel?.field;

  if (layout === 'timeline') {
    if (!xKey) throw new Error('Unit timeline layout requires an x field.');
    const stackByX = stackIndex(units, (d) => d.__row[xKey]);
    const stackHeight = maxStackDepth(units, stackByX);
    const radius = fitRadius(chart, requestedRadius, {
      columns: Math.max(uniqueCount(units, (d) => d.__row[xKey]), 1),
      rows: Math.max(stackHeight, 1)
    });
    const cell = radius * 2.45;
    const x = unitXScale(units, xChannel, [radius, chart.innerWidth - radius], { bandOrLinear, d3 });
    const base = chart.innerHeight - radius;
    drawXAxis(chart, x, xChannel.title || xKey, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: 'timeline', axes: true, r: radius,
      x: (d) => position(x, d.__row[xKey]),
      y: (d) => base - stackByX(d) * cell
    };
  }

  if (layout === 'dodge') {
    if (!xKey) throw new Error('Unit dodge layout requires an x field.');
    let radius = fitRadius(chart, requestedRadius, {
      columns: Math.max(uniqueCount(units, (d) => d.__row[xKey]), 1), rows: 1
    });
    const x = unitXScale(units, xChannel, [radius, chart.innerWidth - radius], { bandOrLinear, d3 });
    let placed = dodgeForHeight(units, radius, chart.innerHeight, (d) => position(x, d.__row[xKey]));
    radius = placed.radius;
    const yByKey = new Map(placed.map((circle) => [circle.data.__unitKey, circle.y]));
    drawXAxis(chart, x, xChannel.title || xKey, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: 'dodge', axes: true, r: radius,
      x: (d) => position(x, d.__row[xKey]),
      y: (d) => chart.innerHeight - radius - yByKey.get(d.__unitKey)
    };
  }

  if (layout === 'bar') {
    if (!groupKey) throw new Error('Unit bar layout requires .group("field").');
    const groups = Array.from(new Set(units.map((d) => d.__row[groupKey])));
    const groupScale = d3.scaleBand().domain(groups).range([0, chart.innerWidth]).padding(0.18);
    const groupCounts = countBy(units, (d) => d.__row[groupKey]);
    const radius = fitGroupedRadius(chart, requestedRadius, groupScale.bandwidth(), d3.max(groupCounts.values()) || 1, columns);
    const cell = radius * 2.45;
    const groupColumns = Math.max(1, Math.min(columns, Math.floor(groupScale.bandwidth() / cell) || 1));
    const stackByGroup = stackIndex(units, (d) => d.__row[groupKey]);
    drawXAxis(chart, groupScale, groupKey, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: 'bar', axes: true, r: radius, groupField: groupKey,
      x: (d) => groupScale(d.__row[groupKey]) + (stackByGroup(d) % groupColumns) * cell + radius,
      y: (d) => chart.innerHeight - radius - Math.floor(stackByGroup(d) / groupColumns) * cell
    };
  }

  if (layout !== 'grid') throw new Error(`Unsupported Unit layout: ${layout}.`);

  const rowsNeeded = Math.ceil(units.length / columns);
  const radius = fitRadius(chart, requestedRadius, { columns, rows: rowsNeeded });
  const cell = radius * 2.45;
  updateGrid(chart, null, d3);
  drawXAxis(chart, null, null, d3);
  drawYAxis(chart, null, null, d3);
  const startX = Math.max(0, (chart.innerWidth - columns * cell) / 2);
  const startY = Math.max(0, (chart.innerHeight - rowsNeeded * cell) / 2);
  return {
    name: 'grid', axes: false, r: radius,
    x: (_, i) => startX + (i % columns) * cell + radius,
    y: (_, i) => startY + Math.floor(i / columns) * cell + radius
  };
}

export function unitSelectionOpacity(unit, spec, dimOpacity = 0.22) {
  const state = specState(spec);
  const selection = state.sceneState?.selection || state.selection || null;
  if (selection?.mode !== 'highlight' || !selection.filter) return 1;
  return matchesFilter(unit.__row || unit, selection.filter)
    ? 1
    : Number(selection.opacity ?? dimOpacity);
}

/**
 * Unit marks are fungible. Match source marks to target slots by the smallest
 * total Euclidean travel distance instead of preserving row order blindly.
 */
export function minimumTravelMatching(sources, targets) {
  if (!sources.length || !targets.length) return [];
  const sourceIsRows = sources.length <= targets.length;
  const rows = sourceIsRows ? sources : targets;
  const columns = sourceIsRows ? targets : sources;
  const costs = rows.map((row) => columns.map((column) =>
    sourceIsRows ? travelDistance(row, column) : travelDistance(column, row)));
  const assignment = hungarian(costs);
  return assignment.map((columnIndex, rowIndex) => {
    const sourceIndex = sourceIsRows ? rowIndex : columnIndex;
    const targetIndex = sourceIsRows ? columnIndex : rowIndex;
    return {
      sourceIndex,
      targetIndex,
      distance: travelDistance(sources[sourceIndex], targets[targetIndex])
    };
  });
}

export function matchUnitSlotsByTravel(chart, units, layout) {
  if (chart.transitionPlan?.match?.mode !== 'minimum-travel') {
    return { units, maxDistance: 0, totalDistance: 0 };
  }
  const sourceNodes = chart.g.selectAll('circle.sl-unit').nodes();
  const sources = sourceNodes.map((node, index) => ({
    index,
    key: String(unitJoinKey(node.__data__) ?? node.dataset.sourceKey ?? node.dataset.key ?? index),
    x: finiteNumber(node.getAttribute('cx')),
    y: finiteNumber(node.getAttribute('cy'))
  })).filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
  const targets = units.map((unit, index) => ({
    index,
    x: finiteNumber(layout.x(unit, index)),
    y: finiteNumber(layout.y(unit, index))
  }));
  const pairs = minimumTravelMatching(sources, targets);
  const pairByTarget = new Map(pairs.map((pair) => [pair.targetIndex, pair]));
  const matchedSourceKeys = new Set(pairs.map((pair) => sources[pair.sourceIndex].key));
  const rematched = units.map((unit, targetIndex) => {
    const pair = pairByTarget.get(targetIndex);
    const semanticKey = String(unit.__semanticUnitKey ?? unit.__unitKey);
    return {
      ...unit,
      __semanticUnitKey: semanticKey,
      __joinKey: pair
        ? sources[pair.sourceIndex].key
        : uniqueEnterKey(semanticKey, targetIndex, matchedSourceKeys),
      __sourceUnitKey: pair ? sources[pair.sourceIndex].key : null,
      __travelDistance: pair?.distance ?? 0
    };
  });
  return {
    units: rematched,
    maxDistance: pairs.reduce((max, pair) => Math.max(max, pair.distance), 0),
    totalDistance: pairs.reduce((sum, pair) => sum + pair.distance, 0)
  };
}

export function resolveUnitTransitionPlan(previousSpec, nextSpec) {
  if (!previousSpec || !nextSpec) return {};
  const diff = diffViewStates(previousSpec, nextSpec);
  const positionChanged = unitPositionSignature(previousSpec) !== unitPositionSignature(nextSpec)
    || ['data', 'filter', 'transform', 'encoding.x'].some((type) => diff.hasDelta(type));
  const timing = defaultTransition({
    ...specTransition(previousSpec),
    ...specTransition(nextSpec)
  });
  const plan = {
    diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next })),
    reason: positionChanged ? 'unit-minimum-travel-layout' : 'unit-default-plan',
    timing,
    totalDuration: timing.duration
  };
  if (!positionChanged) return plan;
  return {
    ...plan,
    match: { mode: 'minimum-travel', reason: 'closest-unit-fills-target-slot' },
    steps: [
      { part: 'view', changes: ['scale', 'axis'] },
      { part: 'marks', changes: ['marks', 'exit', 'enter'] }
    ]
  };
}

/** Evaluate either authored direction on one deterministic cached path. */
export function canonicalUnitTransitionPair(previousSpec, nextSpec) {
  const previousOrder = canonicalUnitOrder(previousSpec);
  const nextOrder = canonicalUnitOrder(nextSpec);
  if (previousOrder <= nextOrder) return { from: previousSpec, to: nextSpec, reverse: false };
  return { from: nextSpec, to: previousSpec, reverse: true };
}

export function unitStageTiming(chart) {
  if (chart.transitionPlan?.match?.mode !== 'minimum-travel') return null;
  const total = Math.max(1, Number(chart.transition.duration) || 900);
  return {
    viewDuration: total * VIEW_STAGE_RATIO,
    travelDelay: total * TRAVEL_STAGE_RATIO,
    markDuration: total * (1 - VIEW_STAGE_RATIO - TRAVEL_STAGE_RATIO)
  };
}

function unitXScale(units, channel, range, deps) {
  const rows = units.map((d) => d.__row);
  const scale = deps.bandOrLinear(rows, channel, range, deps.d3);
  if (typeof scale.nice === 'function') scale.nice();
  return scale;
}

function fitRadius(chart, requestedRadius, { columns = 1, rows = 1 } = {}) {
  return Math.max(2, Math.min(requestedRadius,
    chart.innerWidth / Math.max(columns * 2.45, 1),
    chart.innerHeight / Math.max(rows * 2.45, 1)
  ));
}

function fitGroupedRadius(chart, requestedRadius, groupWidth, maxGroupCount, columns) {
  let radius = Math.min(requestedRadius, groupWidth / 3 / 2.45);
  for (let i = 0; i < 5; i++) {
    const groupColumns = Math.max(1, columns);
    const groupRows = Math.max(1, Math.ceil(maxGroupCount / groupColumns));
    radius = Math.min(requestedRadius,
      groupWidth / Math.max(groupColumns * 2.45, 1),
      chart.innerHeight / Math.max(groupRows * 2.45, 1));
  }
  return Math.max(2, radius);
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function stackIndex(values, group) {
  const counts = new Map();
  const indexes = new Map();
  values.forEach((value) => {
    const key = group(value);
    const index = counts.get(key) || 0;
    counts.set(key, index + 1);
    indexes.set(value.__unitKey, index);
  });
  return (value) => indexes.get(value.__unitKey) || 0;
}

function maxStackDepth(values, stackByValue) {
  return values.reduce((max, value) => Math.max(max, stackByValue(value) + 1), 0);
}

function uniqueCount(values, key) {
  return new Set(values.map(key)).size;
}

function countBy(values, key) {
  const counts = new Map();
  values.forEach((value) => {
    const group = key(value);
    counts.set(group, (counts.get(group) || 0) + 1);
  });
  return counts;
}

function hungarian(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length || 0;
  const u = Array(rowCount + 1).fill(0);
  const v = Array(columnCount + 1).fill(0);
  const matchedRow = Array(columnCount + 1).fill(0);
  const path = Array(columnCount + 1).fill(0);

  for (let row = 1; row <= rowCount; row++) {
    matchedRow[0] = row;
    const minCost = Array(columnCount + 1).fill(Infinity);
    const used = Array(columnCount + 1).fill(false);
    let column0 = 0;
    do {
      used[column0] = true;
      const row0 = matchedRow[column0];
      let delta = Infinity;
      let column1 = 0;
      for (let column = 1; column <= columnCount; column++) {
        if (used[column]) continue;
        const cost = costs[row0 - 1][column - 1] - u[row0] - v[column];
        if (cost < minCost[column]) {
          minCost[column] = cost;
          path[column] = column0;
        }
        if (minCost[column] < delta) {
          delta = minCost[column];
          column1 = column;
        }
      }
      for (let column = 0; column <= columnCount; column++) {
        if (used[column]) {
          u[matchedRow[column]] += delta;
          v[column] -= delta;
        } else {
          minCost[column] -= delta;
        }
      }
      column0 = column1;
    } while (matchedRow[column0] !== 0);

    do {
      const column1 = path[column0];
      matchedRow[column0] = matchedRow[column1];
      column0 = column1;
    } while (column0 !== 0);
  }

  const assignment = Array(rowCount).fill(-1);
  for (let column = 1; column <= columnCount; column++) {
    if (matchedRow[column]) assignment[matchedRow[column] - 1] = column - 1;
  }
  return assignment;
}

function travelDistance(source, target) {
  return Math.hypot(Number(source.x) - Number(target.x), Number(source.y) - Number(target.y));
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function unitJoinKey(unit) {
  return unit?.__joinKey ?? unit?.__unitKey;
}

function uniqueEnterKey(semanticKey, targetIndex, used) {
  let key = `\u0001enter\u0000${semanticKey}\u0000${targetIndex}`;
  while (used.has(key)) key += '\u0000';
  used.add(key);
  return key;
}

function unitPositionSignature(spec) {
  const unit = specUnit(spec) || {};
  return stableStringify({
    layout: unit.layout || 'grid',
    columns: unit.columns ?? null,
    radius: unit.radius ?? null,
    group: unit.group ?? null,
    value: unit.value ?? null,
    x: spec.encoding?.x ?? null
  });
}

function canonicalUnitOrder(spec) {
  const unit = specUnit(spec) || {};
  const layoutRank = UNIT_LAYOUT_ORDER.indexOf(unit.layout || 'grid');
  return `${String(layoutRank < 0 ? UNIT_LAYOUT_ORDER.length : layoutRank).padStart(2, '0')}|${stableStringify(spec)}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function dodgeForHeight(units, radius, height, x) {
  let fittedRadius = radius;
  let placed = dodge(units, { radius: fittedRadius * 2.15, x });
  while (fittedRadius > 2 && maxPlacedY(placed) > height - fittedRadius * 2) {
    fittedRadius -= 0.75;
    placed = dodge(units, { radius: fittedRadius * 2.15, x });
  }
  placed.radius = Math.max(2, fittedRadius);
  return placed;
}

function maxPlacedY(placed) {
  return placed.reduce((max, circle) => Math.max(max, circle.y || 0), 0);
}

function dodge(data, { radius = 1, x = (d) => d } = {}) {
  const radius2 = radius ** 2;
  const circles = data.map((datum, index, values) => ({ x: +x(datum, index, values), data: datum }))
    .sort((a, b) => a.x - b.x);
  const epsilon = 1e-3;
  let head = null;
  let tail = null;

  function intersects(x, y) {
    let a = head;
    while (a) {
      if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) return true;
      a = a.next;
    }
    return false;
  }

  for (const b of circles) {
    while (head && head.x < b.x - radius2) head = head.next;
    if (intersects(b.x, (b.y = 0))) {
      let a = head;
      b.y = Infinity;
      do {
        const y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
        if (y < b.y && !intersects(b.x, y)) b.y = y;
        a = a.next;
      } while (a);
    }
    b.next = null;
    if (head === null) head = tail = b;
    else tail = tail.next = b;
  }

  return circles;
}
