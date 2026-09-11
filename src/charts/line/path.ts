export type LinePathPoint = { x: number; y: number };
export type LinePathInterpolator = (progress: number) => string;

export interface LinePathKeyPoint extends LinePathPoint {
  key: string;
}

export interface LinePathFrame {
  path: string;
  curve: string;
  points: LinePathKeyPoint[];
}

export type LinePathStrategy =
  | 'keep-shape'
  | 'move-points'
  | 'add-points'
  | 'remove-points'
  | 'shift-window'
  | 'change-curve'
  | 'match-shape';

export interface LinePathMatch {
  strategy: LinePathStrategy;
  interpolate: LinePathInterpolator;
}

export interface LineWindowShift {
  direction: 'forward' | 'reverse';
  dx: number;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MIN_SEGMENTS = 32;
const MAX_SEGMENTS = 160;
const PIXELS_PER_SEGMENT = 4;

/**
 * Choose a Line-owned transition from keyed observations before falling back
 * to rendered geometry. The Core never needs to know how an SVG line is made.
 */
export function matchLinePathFrames(
  fromNode: SVGPathElement,
  from: LinePathFrame | null | undefined,
  to: LinePathFrame,
  renderPoints: (points: readonly LinePathPoint[]) => string
): LinePathMatch {
  if (!from || !from.points.length || !to.points.length) {
    return {
      strategy: 'match-shape',
      interpolate: matchLinePaths(fromNode, to.path)
    };
  }

  // A curve change deliberately changes the rendered geometry between the
  // same observations. Geometry sampling is the right tool for that job.
  if (from.curve !== to.curve) {
    return {
      strategy: 'change-curve',
      interpolate: matchLinePaths(fromNode, to.path)
    };
  }

  const fromKeys = from.points.map((point) => point.key);
  const toKeys = to.points.map((point) => point.key);

  if (sameKeysInOrder(fromKeys, toKeys)) {
    if (samePointPositions(from.points, to.points)) {
      return semanticMatch('keep-shape', from, to, pairSameKeys(from.points, to.points), renderPoints);
    }
    return semanticMatch('move-points', from, to, pairSameKeys(from.points, to.points), renderPoints);
  }

  const windowPairs = pairShiftedWindow(from.points, to.points);
  if (windowPairs) {
    return semanticMatch('shift-window', from, to, windowPairs, renderPoints);
  }

  if (isSubset(fromKeys, toKeys)) {
    return semanticMatch('add-points', from, to, pairAddedPoints(from.points, to.points), renderPoints);
  }

  if (isSubset(toKeys, fromKeys)) {
    return semanticMatch('remove-points', from, to, pairRemovedPoints(from.points, to.points), renderPoints);
  }

  return {
    strategy: 'match-shape',
    interpolate: matchLinePaths(fromNode, to.path)
  };
}

/**
 * Match two rendered SVG paths by distance, then move the matched points.
 *
 * A D3 curve change can alter both the number and type of SVG commands.
 * Matching points on the rendered geometry avoids pairing unrelated numbers
 * from the two `d` strings. This work belongs to the Line module; the generic
 * transition runtime only sees the resulting D3 attribute tween.
 */
export function matchLinePaths(
  fromNode: SVGPathElement,
  toPath: string | null | undefined
): LinePathInterpolator {
  const fromPath = fromNode.getAttribute('d') || '';
  const to = toPath || '';
  if (fromPath === to) return () => to;
  if (!fromPath || !to) return stepBetweenPaths(fromPath, to);

  const targetNode = fromNode.ownerDocument.createElementNS(SVG_NAMESPACE, 'path');
  targetNode.setAttribute('d', to);
  targetNode.setAttribute('visibility', 'hidden');
  targetNode.setAttribute('pointer-events', 'none');

  // WebKit needs geometry nodes to be in an SVG tree before measuring them.
  const measurementRoot = fromNode.ownerSVGElement || fromNode.parentNode;
  measurementRoot?.appendChild(targetNode);
  try {
    const fromLength = finiteLength(fromNode);
    const toLength = finiteLength(targetNode);
    const segmentCount = Math.max(
      MIN_SEGMENTS,
      Math.min(MAX_SEGMENTS, Math.ceil(Math.max(fromLength, toLength) / PIXELS_PER_SEGMENT))
    );
    const fromPoints = sampleLinePath(fromNode, fromLength, segmentCount);
    const toPoints = sampleLinePath(targetNode, toLength, segmentCount);
    const movePoints = interpolateLinePoints(fromPoints, toPoints);

    return (progress: number) => {
      const value = clampProgress(progress);
      if (value === 0) return fromPath;
      if (value === 1) return to;
      return movePoints(value);
    };
  } finally {
    targetNode.remove();
  }
}

/** Pure point interpolation used by matchLinePaths and its unit tests. */
export function interpolateLinePoints(
  fromPoints: readonly LinePathPoint[],
  toPoints: readonly LinePathPoint[]
): LinePathInterpolator {
  if (!fromPoints.length || fromPoints.length !== toPoints.length) {
    throw new Error('Line path matching requires two non-empty point lists of equal length.');
  }

  return (progress: number) => {
    const value = clampProgress(progress);
    let path = '';
    for (let index = 0; index < fromPoints.length; index += 1) {
      const from = fromPoints[index];
      const to = toPoints[index];
      const x = from.x + (to.x - from.x) * value;
      const y = from.y + (to.y - from.y) * value;
      path += `${index === 0 ? 'M' : 'L'}${shortNumber(x)},${shortNumber(y)}`;
    }
    return path;
  };
}

function sampleLinePath(
  node: SVGPathElement,
  length: number,
  segmentCount: number
): LinePathPoint[] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const point = node.getPointAtLength(length * index / segmentCount);
    return { x: point.x, y: point.y };
  });
}

interface PointPair {
  from: LinePathPoint;
  to: LinePathPoint;
}

function semanticMatch(
  strategy: LinePathStrategy,
  from: LinePathFrame,
  to: LinePathFrame,
  pairs: PointPair[],
  renderPoints: (points: readonly LinePathPoint[]) => string
): LinePathMatch {
  return {
    strategy,
    interpolate: (progress: number) => {
      const value = clampProgress(progress);
      if (value === 0) return from.path;
      if (value === 1) return to.path;
      return renderPoints(pairs.map((pair) => ({
        x: pair.from.x + (pair.to.x - pair.from.x) * value,
        y: pair.from.y + (pair.to.y - pair.from.y) * value
      })));
    }
  };
}

function pairSameKeys(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): PointPair[] {
  return from.map((point, index) => ({ from: point, to: to[index] }));
}

/** New points grow out of the line segment or endpoint nearest to their key. */
function pairAddedPoints(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): PointPair[] {
  const fromByKey = pointMap(from);
  return to.map((point, index) => ({
    from: fromByKey.get(point.key) ?? anchorMissingPoint(index, to, fromByKey),
    to: point
  }));
}

/** Removed points collapse back into the surviving line instead of fading globally. */
function pairRemovedPoints(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): PointPair[] {
  const toByKey = pointMap(to);
  return from.map((point, index) => ({
    from: point,
    to: toByKey.get(point.key) ?? anchorMissingPoint(index, from, toByKey)
  }));
}

/**
 * A sliding window keeps a contiguous run of keys while one edge exits and
 * the other enters. Keep both edge points just outside the clipped plot and
 * move the shared observations by identity; this removes the vertical wiggle
 * caused by pairing path commands by index.
 */
function pairShiftedWindow(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): PointPair[] | null {
  const shift = findLineWindowShift(from, to);
  if (!shift) return null;
  const fromByKey = pointMap(from);
  const toByKey = pointMap(to);
  const ordered = shift.direction === 'forward'
    ? [...from, ...to.filter((point) => !fromByKey.has(point.key))]
    : [...to.filter((point) => !fromByKey.has(point.key)), ...from];

  return ordered.map((point) => {
    const source = fromByKey.get(point.key);
    const target = toByKey.get(point.key);
    return {
      from: source ?? { x: target!.x - shift.dx, y: target!.y },
      to: target ?? { x: source!.x + shift.dx, y: source!.y }
    };
  });
}

/** Return the shared horizontal movement for a contiguous sliding key window. */
export function findLineWindowShift(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): LineWindowShift | null {
  if (from.length !== to.length || from.length < 3) return null;
  const direction = shiftedWindowDirection(from, to);
  if (!direction) return null;

  const toByKey = pointMap(to);
  const common = from.filter((point) => toByKey.has(point.key));
  if (common.length < 2) return null;
  const dxValues = common.map((point) => toByKey.get(point.key)!.x - point.x);
  const dx = dxValues.reduce((sum, value) => sum + value, 0) / dxValues.length;
  if (!Number.isFinite(dx) || Math.abs(dx) < 0.001) return null;
  return { direction, dx };
}

function shiftedWindowDirection(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): 'forward' | 'reverse' | null {
  const forwardOffset = from.findIndex((point) => point.key === to[0].key);
  if (
    forwardOffset > 0 &&
    from.slice(forwardOffset).every((point, index) => point.key === to[index]?.key)
  ) return 'forward';

  const reverseOffset = to.findIndex((point) => point.key === from[0].key);
  if (
    reverseOffset > 0 &&
    to.slice(reverseOffset).every((point, index) => point.key === from[index]?.key)
  ) return 'reverse';

  return null;
}

function anchorMissingPoint(
  index: number,
  ordered: readonly LinePathKeyPoint[],
  known: Map<string, LinePathKeyPoint>
): LinePathPoint {
  let before = index - 1;
  while (before >= 0 && !known.has(ordered[before].key)) before -= 1;
  let after = index + 1;
  while (after < ordered.length && !known.has(ordered[after].key)) after += 1;

  const left = before >= 0 ? known.get(ordered[before].key) : null;
  const right = after < ordered.length ? known.get(ordered[after].key) : null;
  if (left && right) {
    const ratio = (index - before) / (after - before);
    return {
      x: left.x + (right.x - left.x) * ratio,
      y: left.y + (right.y - left.y) * ratio
    };
  }
  if (left) return { x: left.x, y: left.y };
  if (right) return { x: right.x, y: right.y };
  return { x: ordered[index].x, y: ordered[index].y };
}

function pointMap(points: readonly LinePathKeyPoint[]): Map<string, LinePathKeyPoint> {
  return new Map(points.map((point) => [point.key, point]));
}

function sameKeysInOrder(from: readonly string[], to: readonly string[]): boolean {
  return from.length === to.length && from.every((key, index) => key === to[index]);
}

function samePointPositions(
  from: readonly LinePathKeyPoint[],
  to: readonly LinePathKeyPoint[]
): boolean {
  return from.every((point, index) =>
    Math.abs(point.x - to[index].x) < 0.001 && Math.abs(point.y - to[index].y) < 0.001);
}

function isSubset(subset: readonly string[], superset: readonly string[]): boolean {
  const keys = new Set(superset);
  return subset.length < superset.length && subset.every((key) => keys.has(key));
}

function finiteLength(node: SVGPathElement): number {
  const length = node.getTotalLength();
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function stepBetweenPaths(fromPath: string, toPath: string): LinePathInterpolator {
  return (progress: number) => clampProgress(progress) < 1 ? fromPath : toPath;
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, Number(progress) || 0));
}

function shortNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}
