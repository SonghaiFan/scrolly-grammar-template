import { filterPredicate } from '../data/filter.js';
import { specState } from '../spec-meta.js';
import type { ChannelSpec, SelectionSpec, ViewSpec } from '../types/index.js';

type DataRow = Record<string, unknown>;
type AnyRecord = Record<string, unknown>;

interface FocusScaleDeps {
  bandOrLinear: (rows: unknown[], channel: unknown, range: number[], d3: unknown) => AnyRecord;
  d3: AnyRecord;
  niceExtent: (rows: unknown[], field: string) => unknown[];
  position: (scale: unknown, value: unknown) => number;
}

export function viewSelection(spec: ViewSpec): SelectionSpec | null {
  const state = specState(spec);
  return (state.sceneState?.selection || state.selection || null) as SelectionSpec | null;
}

/**
 * Keep every mark in the scene while fitting one positional scale to the
 * selected rows. Marks outside the focused range remain available to the
 * clipped plot instead of becoming enter/exit items.
 */
export function focusedScale(
  rows: DataRow[],
  channel: ChannelSpec | undefined,
  range: number[],
  selection: SelectionSpec | null | undefined,
  deps: FocusScaleDeps
): AnyRecord {
  const base = deps.bandOrLinear(rows, channel, range, deps.d3);
  if (selection?.mode !== 'focus' || !selection.filter || !channel?.field) return base;

  const selectedRows = rows.filter(filterPredicate(selection.filter));
  if (!selectedRows.length) return base;

  if (channel.type === 'quantitative' || channel.type === 'temporal') {
    const domain = focusedDomain(selectedRows, channel, deps);
    return deps.bandOrLinear(rows, { ...channel, domain }, range, deps.d3);
  }

  return fitDiscreteRange(base, selectedRows, channel.field, range, rows, channel, deps);
}

function focusedDomain(
  rows: DataRow[],
  channel: ChannelSpec,
  deps: FocusScaleDeps
): unknown[] {
  if (channel.type === 'temporal') {
    const extent = deps.d3['extent'] as (values: DataRow[], accessor: (row: DataRow) => Date) => unknown[];
    return extent(rows, (row: DataRow) => new Date(row[channel.field!] as string));
  }
  return deps.niceExtent(rows, channel.field!);
}

function fitDiscreteRange(
  base: AnyRecord,
  selectedRows: DataRow[],
  field: string,
  range: number[],
  rows: DataRow[],
  channel: ChannelSpec,
  deps: FocusScaleDeps
): AnyRecord {
  const positions = selectedRows
    .map((row) => deps.position(base, row[field]))
    .filter(Number.isFinite);
  if (!positions.length) return base;

  const coordinateLow = Math.min(...range);
  const coordinateHigh = Math.max(...range);
  const span = coordinateHigh - coordinateLow;
  if (!(span > 0)) return base;

  const bandwidth = typeof base.bandwidth === 'function' ? Number(base.bandwidth()) : 0;
  let sourceLow = Math.min(...positions) - bandwidth / 2;
  let sourceHigh = Math.max(...positions) + bandwidth / 2;
  if (!(sourceHigh > sourceLow)) {
    const fallback = Math.max(1, span / Math.max(2, rows.length));
    sourceLow = positions[0] - fallback / 2;
    sourceHigh = positions[0] + fallback / 2;
  }

  const inset = Math.min(span * 0.08, 44);
  const targetLow = coordinateLow + inset;
  const targetHigh = coordinateHigh - inset;
  const factor = (targetHigh - targetLow) / (sourceHigh - sourceLow);
  const expandedLow = targetLow - sourceLow * factor;
  const expandedHigh = expandedLow + span * factor;
  const expandedRange = range[0] <= range[range.length - 1]
    ? [expandedLow, expandedHigh]
    : [expandedHigh, expandedLow];

  return deps.bandOrLinear(rows, channel, expandedRange, deps.d3);
}
