export type PathPoint = { x: number; y: number };
export type PathInterpolator = (progress: number) => string;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MIN_SEGMENTS = 32;
const MAX_SEGMENTS = 160;
const PIXELS_PER_SEGMENT = 4;

/** Match any two rendered SVG paths by distance, including closed Area paths. */
export function matchRenderedPaths(
  fromNode: SVGPathElement,
  toPath: string | null | undefined
): PathInterpolator {
  const fromPath = fromNode.getAttribute('d') || '';
  const to = toPath || '';
  if (fromPath === to) return () => to;
  if (!fromPath || !to) return stepBetweenPaths(fromPath, to);

  const targetNode = fromNode.ownerDocument.createElementNS(SVG_NAMESPACE, 'path');
  targetNode.setAttribute('d', to);
  targetNode.setAttribute('visibility', 'hidden');
  targetNode.setAttribute('pointer-events', 'none');
  const measurementRoot = fromNode.ownerSVGElement || fromNode.parentNode;
  measurementRoot?.appendChild(targetNode);
  try {
    const fromLength = finiteLength(fromNode);
    const toLength = finiteLength(targetNode);
    const segmentCount = Math.max(
      MIN_SEGMENTS,
      Math.min(MAX_SEGMENTS, Math.ceil(Math.max(fromLength, toLength) / PIXELS_PER_SEGMENT))
    );
    const movePoints = interpolatePathPoints(
      samplePath(fromNode, fromLength, segmentCount),
      samplePath(targetNode, toLength, segmentCount)
    );
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

export function interpolatePathPoints(
  fromPoints: readonly PathPoint[],
  toPoints: readonly PathPoint[]
): PathInterpolator {
  if (!fromPoints.length || fromPoints.length !== toPoints.length) {
    throw new Error('Path matching requires two non-empty point lists of equal length.');
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

function samplePath(node: SVGPathElement, length: number, segmentCount: number): PathPoint[] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const point = node.getPointAtLength(length * index / segmentCount);
    return { x: point.x, y: point.y };
  });
}

function finiteLength(node: SVGPathElement): number {
  const length = node.getTotalLength();
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function stepBetweenPaths(fromPath: string, toPath: string): PathInterpolator {
  return (progress: number) => clampProgress(progress) < 1 ? fromPath : toPath;
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, Number(progress) || 0));
}

function shortNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}
