/** Exact names exported by D3 7 for use with d3.line().curve(). */
export const D3_CURVE_NAMES = [
  'curveBasis',
  'curveBasisClosed',
  'curveBasisOpen',
  'curveBumpX',
  'curveBumpY',
  'curveBundle',
  'curveCardinal',
  'curveCardinalClosed',
  'curveCardinalOpen',
  'curveCatmullRom',
  'curveCatmullRomClosed',
  'curveCatmullRomOpen',
  'curveLinear',
  'curveLinearClosed',
  'curveMonotoneX',
  'curveMonotoneY',
  'curveNatural',
  'curveStep',
  'curveStepAfter',
  'curveStepBefore'
] as const;

export type D3CurveName = typeof D3_CURVE_NAMES[number];

const D3_CURVE_NAME_SET = new Set<string>(D3_CURVE_NAMES);

export function isD3CurveName(value: unknown): value is D3CurveName {
  return typeof value === 'string' && D3_CURVE_NAME_SET.has(value);
}

/** Resolve a serializable D3 export name without translating its meaning. */
export function d3Curve(name: D3CurveName | undefined, d3: Record<string, unknown>): unknown {
  const curveName = name ?? 'curveLinear';
  const curve = d3[curveName];
  if (typeof curve !== 'function') {
    throw new Error(`The supplied D3 build does not export "${curveName}".`);
  }
  return curve;
}
