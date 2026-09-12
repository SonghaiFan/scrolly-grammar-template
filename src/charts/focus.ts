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

  const selectedDomain = Array.from(new Set(selectedRows.map((row) => row[channel.field!])))
    .filter((value) => value != null);
  return selectedDomain.length
    ? deps.bandOrLinear(rows, { ...channel, domain: selectedDomain }, range, deps.d3)
    : base;
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
