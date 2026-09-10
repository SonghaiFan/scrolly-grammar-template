import type { ChannelSpec, SelectionSpec, ViewSpec } from '../../types/index.js';
import { specState } from '../../spec-meta.js';
import { filterPredicate } from '../../data/filter.js';

interface LineState {
  selection: SelectionSpec | null;
  seriesField: string | null;
}

interface LineSeries {
  key: string;
  rows: Record<string, unknown>[];
}

export function lineState(spec: ViewSpec = {}, enc: Record<string, ChannelSpec> = {}): LineState {
  const state = specState(spec);
  const detail = (state.sceneState as Record<string, unknown> | undefined)?.['detail'] as Record<string, unknown> | undefined ?? {};
  return {
    selection: ((state.sceneState as Record<string, unknown> | undefined)?.['selection'] || state.selection || null) as SelectionSpec | null,
    seriesField: (detail['seriesField'] as string) || enc['color']?.field || null
  };
}

export function lineSeries(rows: Record<string, unknown>[], seriesField: string | null): LineSeries[] {
  if (!seriesField) return [{ key: '__line', rows }];

  const grouped = new Map<string, Record<string, unknown>[]>();
  rows.forEach((row) => {
    const key = String(row[seriesField] ?? '__missing');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  });

  return Array.from(grouped, ([key, values]) => ({ key, rows: values }));
}

export function selectedLineXScale(
  rows: Record<string, unknown>[],
  channel: ChannelSpec | undefined,
  chart: Record<string, unknown>,
  selection: SelectionSpec | null,
  deps: Record<string, unknown>
): unknown {
  const { bandOrLinear, d3, niceExtent, position } = deps;
  const baseRange = [0, chart['innerWidth'] as number];
  if (!selection?.filter || (selection as Record<string, unknown>)['mode'] !== 'rangeCrop') {
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);
  }

  const selectedRows = rows.filter(filterPredicate(selection.filter));
  if (selectedRows.length < 2) {
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);
  }

  const base = (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);

  if (channel?.type === 'quantitative' || channel?.type === 'temporal') {
    const domain = selectedDomain(selectedRows, channel, d3 as unknown, niceExtent as unknown);
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(
      rows,
      { ...channel, domain },
      baseRange,
      d3
    );
  }

  const positionFn = position as (scale: unknown, value: unknown) => number;
  const positions = selectedRows
    .map((row) => positionFn(base, row[channel?.field ?? '']))
    .filter(Number.isFinite);
  if (positions.length < 2) return base;

  const min = Math.min(...positions);
  const max = Math.max(...positions);
  if (min === max) return base;

  const innerWidth = chart['innerWidth'] as number;
  const inset = Math.min(innerWidth * 0.08, 44);
  const factor = (innerWidth - inset * 2) / (max - min);
  return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(
    rows,
    channel,
    [inset - min * factor, inset + (innerWidth - min) * factor],
    d3
  );
}

function selectedDomain(
  rows: Record<string, unknown>[],
  channel: ChannelSpec,
  d3: unknown,
  niceExtent: unknown
): unknown[] {
  const d3Obj = d3 as Record<string, unknown>;
  if (channel.type === 'temporal') {
    return (d3Obj['extent'] as (rows: unknown[], fn: (d: unknown) => unknown) => unknown[])(
      rows,
      (d) => new Date((d as Record<string, unknown>)[channel.field!] as string)
    );
  }
  return (niceExtent as (rows: unknown[], field: string) => unknown[])(rows, channel.field!);
}
