import type { ChannelSpec, ChannelType, EncodingSpec, ViewSpec } from '../types/index.js';

type DataRow = Record<string, unknown>;

/** Detect the semantic type of every field in tidy rows. */
export function detectDataTypes(rows: readonly unknown[]): Record<string, ChannelType> {
  const fields = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    for (const field of Object.keys(row as DataRow)) fields.add(field);
  }
  return Object.fromEntries(
    [...fields].map((field) => [field, inferFieldType(rows, field)])
  );
}

/** Infer one field conservatively. Mixed or unknown values remain nominal. */
export function inferFieldType(rows: readonly unknown[], field: string): ChannelType {
  const values = rows
    .filter((row): row is DataRow => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map((row) => row[field])
    .filter((value) => value != null && value !== '');

  if (!values.length) return 'nominal';
  if (values.every(isTemporalValue)) return 'temporal';
  if (values.every(isQuantitativeValue)) return 'quantitative';
  return 'nominal';
}

/** Fill only missing channel types. An authored type always wins. */
export function resolveEncodingTypes(
  rows: readonly unknown[],
  encoding: EncodingSpec = {}
): EncodingSpec {
  return Object.fromEntries(
    Object.entries(encoding).map(([name, channel]) => [
      name,
      Array.isArray(channel)
        ? channel.map((item) => resolveChannelType(rows, item))
        : resolveChannelType(rows, channel)
    ])
  ) as EncodingSpec;
}

/** Return a detached spec whose data-backed channels have resolved types. */
export function resolveSpecDataTypes(spec: ViewSpec, rows: readonly unknown[]): ViewSpec {
  if (!spec.encoding) return spec;
  return { ...spec, encoding: resolveEncodingTypes(rows, spec.encoding) };
}

/** Convert a value to the runtime representation required by its channel. */
export function channelValue(value: unknown, channel?: ChannelSpec): unknown {
  if (channel?.type === 'temporal') {
    if (value instanceof Date) return value;
    const date = new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (channel?.type === 'quantitative') {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  return value;
}

function resolveChannelType(
  rows: readonly unknown[],
  channel: ChannelSpec | undefined
): ChannelSpec | undefined {
  if (!channel?.field || channel.type) return channel;
  return { ...channel, type: inferFieldType(rows, channel.field) };
}

function isTemporalValue(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !ISO_DATE.test(value.trim())) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isQuantitativeValue(value: unknown): boolean {
  if (typeof value === 'boolean' || value instanceof Date) return false;
  return (typeof value === 'number' || typeof value === 'string') &&
    value !== '' && Number.isFinite(Number(value));
}

// Deliberately conservative: do not turn labels containing a date-like phrase
// into time. D3 autoType produces Date objects for the same ISO family.
const ISO_DATE = /^\d{4}-\d{2}(?:-\d{2})?(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
