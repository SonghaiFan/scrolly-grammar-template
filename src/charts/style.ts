import type { ChannelSpec, MarginSpec } from '../types/index.js';

export type ChartGridStyle = 'none' | 'horizontal' | 'vertical' | 'both';
export type ChartLegendPosition = 'top' | 'right';

export interface ChartStyleRule {
  margin: Readonly<MarginSpec>;
  grid: ChartGridStyle;
  openXDomain: boolean;
  openYDomain: boolean;
  edgeTitles: boolean;
}

export interface ChartStyleModule {
  key: string;
  tickSpacing: Readonly<{ x: number; y: number }>;
  edgeTitleInset: Readonly<{ top: number; right: number; bottom: number; left: number }>;
  legendInset: Readonly<{ top: number; left: number }>;
  legendPosition: ChartLegendPosition;
  charts: Readonly<Record<'bar' | 'point' | 'line' | 'area' | 'unit', ChartStyleRule>>;
  axisTitle(channel: ChannelSpec | undefined, direction: 'right' | 'up'): string | undefined;
}

export interface ChartStyleRuleDefinition extends Partial<Omit<ChartStyleRule, 'margin'>> {
  margin?: Partial<MarginSpec>;
}

export interface ChartStyleDefinition {
  key: string;
  tickSpacing?: Partial<{ x: number; y: number }>;
  edgeTitleInset?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  legendInset?: Partial<{ top: number; left: number }>;
  legendPosition?: ChartLegendPosition;
  charts?: Partial<Record<'bar' | 'point' | 'line' | 'area' | 'unit', ChartStyleRuleDefinition>>;
  axisTitle?: ChartStyleModule['axisTitle'];
}

const D3_STYLE = {
  tickSpacing: { x: 80, y: 56 },
  // Match the D3 gallery convention: the upward y title lives in the chart's
  // top inset close to the axis, but not on the plot's first tick row.
  edgeTitleInset: { top: 12, right: 0, bottom: 4, left: 0 },
  legendInset: { top: 8, left: 8 },
  charts: {
    // Keep one margin contract across a chart's encoding states. Margin is
    // geometry: changing color or orientation must not move a clip edge
    // independently from its marks and axes.
    bar: { margin: { top: 56, right: 20, bottom: 40, left: 56 }, grid: 'none', openXDomain: false, openYDomain: true, edgeTitles: true },
    point: { margin: { top: 56, right: 20, bottom: 40, left: 44 }, grid: 'both', openXDomain: true, openYDomain: true, edgeTitles: true },
    line: { margin: { top: 56, right: 20, bottom: 40, left: 48 }, grid: 'horizontal', openXDomain: false, openYDomain: true, edgeTitles: true },
    area: { margin: { top: 56, right: 20, bottom: 40, left: 48 }, grid: 'horizontal', openXDomain: false, openYDomain: true, edgeTitles: true },
    unit: { margin: { top: 28, right: 20, bottom: 40, left: 40 }, grid: 'none', openXDomain: false, openYDomain: true, edgeTitles: true }
  }
} as const;

/** Define a structural chart-style module. Omitted rules inherit the default. */
export function defineChartStyle(definition: ChartStyleDefinition): ChartStyleModule {
  const key = String(definition?.key || '').trim();
  if (!key) throw new Error('Chart style modules require a key.');
  const charts = Object.fromEntries(
    Object.entries(D3_STYLE.charts).map(([chart, defaults]) => {
      const override = definition.charts?.[chart as keyof typeof D3_STYLE.charts] || {};
      return [chart, {
        ...defaults,
        ...override,
        margin: { ...defaults.margin, ...(override.margin || {}) }
      }];
    })
  ) as unknown as ChartStyleModule['charts'];
  return Object.freeze({
    key,
    tickSpacing: Object.freeze({ ...D3_STYLE.tickSpacing, ...(definition.tickSpacing || {}) }),
    edgeTitleInset: Object.freeze({
      ...D3_STYLE.edgeTitleInset,
      ...(definition.edgeTitleInset || {})
    }),
    legendInset: Object.freeze({ ...D3_STYLE.legendInset, ...(definition.legendInset || {}) }),
    legendPosition: definition.legendPosition || 'top',
    charts: Object.freeze(charts),
    axisTitle: definition.axisTitle || directionalAxisTitle
  });
}

/** Restrained D3-inspired grammar used when no style module is supplied. */
export const d3ChartStyle = defineChartStyle({ key: 'd3' });

const PAPER_MARGIN = { top: 28, right: 112, bottom: 50, left: 62 };
const PAPER_CARTESIAN = {
  margin: PAPER_MARGIN,
  grid: 'horizontal' as const,
  openXDomain: false,
  openYDomain: false,
  edgeTitles: false
};

/** Print-oriented spacing paired with the scoped `.vd-style-paper` CSS preset. */
export const paperChartStyle = defineChartStyle({
  key: 'paper',
  tickSpacing: { x: 92, y: 62 },
  legendPosition: 'right',
  legendInset: { top: 4, left: 16 },
  charts: {
    bar: PAPER_CARTESIAN,
    point: PAPER_CARTESIAN,
    line: PAPER_CARTESIAN,
    area: PAPER_CARTESIAN,
    unit: { margin: { top: 24, right: 112, bottom: 48, left: 54 }, edgeTitles: false }
  },
  axisTitle: channel => channel?.title
});

/** Compact high-contrast spacing paired with the scoped `.vd-style-dark` CSS preset. */
export const darkChartStyle = defineChartStyle({
  key: 'dark',
  tickSpacing: { x: 66, y: 46 },
  edgeTitleInset: { top: 11 },
  charts: {
    bar: { margin: { top: 54, right: 18, bottom: 38, left: 52 }, grid: 'horizontal' },
    point: { margin: { top: 54, right: 18, bottom: 38, left: 44 }, grid: 'both' },
    line: { margin: { top: 54, right: 18, bottom: 38, left: 48 }, grid: 'horizontal' },
    area: { margin: { top: 54, right: 18, bottom: 38, left: 48 }, grid: 'horizontal' }
  }
});

/** Built-in structural presets. Their matching CSS ships in `visdelta/style.css`. */
export const chartStylePresets = Object.freeze({
  d3: d3ChartStyle,
  paper: paperChartStyle,
  dark: darkChartStyle
});

/** Backward-compatible internal name for the default presentation module. */
export const CHART_STYLE = d3ChartStyle;

export function chartStyle(deps: { chartStyle?: ChartStyleModule } = {}): ChartStyleModule {
  return deps.chartStyle || d3ChartStyle;
}

export function responsiveTickCount(length: number, spacing: number): number {
  return Math.max(2, Math.floor(Math.max(0, length) / spacing));
}

export function directionalAxisTitle(
  channel: ChannelSpec | undefined,
  direction: 'right' | 'up'
): string | undefined {
  const title = channel?.title;
  if (!title) return undefined;
  return direction === 'right' ? `${title} →` : `↑ ${title}`;
}
