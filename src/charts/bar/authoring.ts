import { serializeViewSpec } from '../../spec-meta.js';
import { cloneState } from '../../grammar/view-state.js';
import { normalizeFilter } from '../../data/filter.js';
import { labelFromValue, titleize } from '../../labels.js';
import { ChartState, channelFrom, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createBarSpecCompiler } from './compile.js';
import type {
  BarLayout,
  ChannelSpec,
  FilterSpec,
  DetailSpec,
  AxisSpec,
  SemanticKey,
  TransitionOrder,
  ViewSpec
} from '../../types/index.js';

export interface BarViewState extends ViewSpec {
  mark: 'bar';
  where?: FilterSpec[];
  detail?: DetailSpec | null;
  axis?: AxisSpec | null;
  aggregate?: unknown;
  semanticKey?: SemanticKey | null;
}

export function bar(data?: unknown): BarState {
  return new BarState({ data: normalizeDataSource(data), mark: 'bar', encoding: {} } as BarViewState);
}

const BAR_SPEC_COMPILER = createBarSpecCompiler();

export class BarState extends ChartState<BarViewState> {
  override toSpec(): Omit<BarViewState, '__grammar'> {
    const spec = cloneState(this.state) as BarViewState & { __grammar?: unknown };
    delete spec.__grammar;

    const filters: FilterSpec[] = [
      ...((spec.where ?? []) as FilterSpec[]),
      ...(spec.filter ? [spec.filter as FilterSpec] : [])
    ];
    if (filters.length) {
      spec.transform = [
        ...filters.map((filter) => ({ filter })),
        ...(spec.transform ?? [])
      ];
    }
    delete spec.where;
    delete spec.filter;
    if (spec.detail == null) delete spec.detail;
    if (spec.axis == null) delete spec.axis;
    delete spec.aggregate;
    if (spec.semanticKey == null) delete spec.semanticKey;

    return pruneAuthoringState(
      compileViewWithCompiler(serializeViewSpec(spec as ViewSpec), { scene: [] }, BAR_SPEC_COMPILER)
    ) as Omit<BarViewState, '__grammar'>;
  }

  override x(field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    const channel = channelFrom(field, { type: 'nominal', ...options });
    return this.with({
      key: (this.state as BarViewState).key ?? channel.field,
      encoding: { x: channel }
    } as Partial<BarViewState>);
  }

  override y(field: string | ChannelSpec, options: Partial<ChannelSpec> | string = {}): this {
    if (typeof options === 'string') options = { title: options };
    const { color, tooltip, ...channelOptions } = options as Partial<ChannelSpec> & {
      color?: unknown;
      tooltip?: unknown;
    };
    const channel = channelFrom(field, { type: 'quantitative', ...channelOptions });
    return this.with({
      encoding: {
        y: channel,
        ...(color ? { color: colorFrom(color as string | ChannelSpec) } : {}),
        ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
      }
    } as Partial<BarViewState>);
  }

  where(selector: string | Record<string, unknown> | FilterSpec | null): this {
    if (selector == null) {
      return this.with({ where: [] } as Partial<BarViewState>, 'selection');
    }
    const selectors = normalizeSelectors(selector);
    const identity = identityFromSelectors(this.state as BarViewState, selectors);
    const measureTitle = measureTitleFromSelectors(this.state as BarViewState, selectors);
    return this.with({
      where: setConstraints((this.state as BarViewState).where ?? [], selectors),
      ...(identity ?? {}),
      ...(measureTitle
        ? {
            encoding: {
              y: {
                ...((this.state as BarViewState).encoding?.y ?? {}),
                title: measureTitle
              }
            }
          }
        : {}),
      __grammar: {
        lastWhere: {
          selectors: cloneState(selectors),
          fields: selectors.map((s) => s.field)
        },
        ...(measureTitle
          ? { measureSelector: { title: measureTitle, fields: selectors.map((s) => s.field) } }
          : {})
      }
    } as Partial<BarViewState>, 'selection');
  }

  flip(options: TransitionOrder & {
    domain?: unknown[];
    scale?: Record<string, unknown>;
  } = {}): this {
    const domain = options.domain ?? (options.scale as Record<string, unknown> | undefined)?.domain;
    const scale = domain || options.scale
      ? { ...(options.scale ?? {}), ...(domain ? { domain } : {}) }
      : undefined;
    return this.axis({
      flip: true,
      ...(scale ? { scale } : {}),
      ...(options.order ? { order: options.order } : {}),
      ...(options.duration != null ? { duration: options.duration } : {}),
      ...(options.stagger ? { stagger: options.stagger } : {})
    });
  }

  breakdown(
    segment = 'type',
    options: {
      category?: string;
      value?: string;
      by?: string | string[];
      layout?: BarLayout;
      op?: string;
      title?: string | false;
      color?: unknown;
      tooltip?: unknown;
      [key: string]: unknown;
    } = {}
  ): this {
    const category = options.category ?? (this.state as BarViewState).encoding?.x?.field;
    const value = options.value ?? (this.state as BarViewState).encoding?.y?.field ?? 'count';
    const { by, category: _cat, value: _val, ...rest } = options;
    const next = aggregateBarState(this, {
      ...rest,
      by: by ?? ([category, segment].filter(Boolean) as string[]),
      segment,
      value,
      layout: options.layout ?? 'stacked',
      op: options.op ?? 'sum'
    });
    return (options.title === false ? next : next.y(value, { title: options.title ?? titleize(value) })) as unknown as this;
  }

  rollup(
    groupbyOrOptions:
      | string
      | string[]
      | {
          groupby?: string | string[];
          by?: string | string[];
          value?: string;
          as?: string;
          op?: string;
          color?: unknown;
          title?: string;
          [key: string]: unknown;
        }
      | null = null,
    options: {
      groupby?: string | string[];
      by?: string | string[];
      value?: string;
      as?: string;
      op?: string;
      color?: unknown;
      title?: string;
      [key: string]: unknown;
    } = {}
  ): this {
    if (groupbyOrOptions && typeof groupbyOrOptions === 'object' && !Array.isArray(groupbyOrOptions)) {
      options = groupbyOrOptions;
      groupbyOrOptions = options.groupby ?? options.by ?? null;
    }
    const parent = groupbyOrOptions ?? options.groupby ?? options.by
      ?? (this.state as BarViewState).encoding?.x?.field;
    const fields = (asArray(parent as string | string[] | null).filter(Boolean) as string[]);
    const value = options.value ?? (this.state as BarViewState).encoding?.y?.field ?? 'count';
    const { color, title, by: _by, groupby: _groupby, value: _value, ...rest } = options;

    let nextState = aggregateBarState(this, {
      ...rest,
      groupby: fields,
      value,
      as: options.as ?? value,
      op: options.op ?? 'sum'
    });
    if (!color) {
      const next = cloneState(nextState.state) as BarViewState;
      const colorFields = channelFields(next.encoding?.color);
      if (colorFields.some((field) => !fields.includes(field))) {
        delete next.encoding?.color;
        nextState = new BarState(next);
      }
    }
    if (title) nextState = nextState.y(value, { title }) as BarState;
    if (color) nextState = nextState.color(color as string | ChannelSpec) as BarState;
    return nextState as unknown as this;
  }

  segment(
    fieldOrConfig:
      | string
      | {
          segment?: string;
          category?: string;
          value?: string;
          as?: [string, string];
          fields?: string[];
          labels?: Record<string, string>;
          categoryTitle?: string;
          valueTitle?: string;
          layout?: BarLayout;
          color?: ChannelSpec;
          domain?: unknown[];
          range?: unknown[];
          source?: string;
          groupby?: string[];
          key?: string | string[];
          tooltip?: unknown;
        } = {},
    maybeConfig: Record<string, unknown> = {}
  ): this {
    const config =
      typeof fieldOrConfig === 'string'
        ? { ...maybeConfig, segment: fieldOrConfig }
        : fieldOrConfig;

    const state = this.state as BarViewState;
    const category = config.category ?? state.encoding?.x?.field;
    const value = config.value ?? config.as?.[1] ?? 'value';
    const segment = config.segment ?? config.as?.[0] ?? 'segment';
    const fields = config.fields ?? [];
    const tidy = !fields.length && Boolean(config.segment);
    const labels = config.labels ?? Object.fromEntries(fields.map((f) => [f, titleize(f)]));

    return this.with({
      key: config.key ?? [category, segment],
      where: tidy ? clearConstraint(state.where ?? [], segment) : state.where,
      detail: {
        category,
        categoryTitle: config.categoryTitle ?? state.encoding?.x?.title,
        fields,
        labels,
        segment,
        value,
        valueTitle: config.valueTitle ?? titleize(value),
        layout: config.layout ?? 'stacked',
        color: cloneState(config.color),
        domain: config.domain,
        range: config.range,
        source: tidy ? segment : config.source,
        groupby: tidy ? [category, segment].filter(Boolean) as string[] : config.groupby
      } as DetailSpec,
      ...(config.tooltip
        ? { encoding: { tooltip: cloneState(config.tooltip) } }
        : {})
    } as Partial<BarViewState>, 'detail');
  }

  layout(layout: BarLayout, options: TransitionOrder = {}): this {
    const state = this.state as BarViewState;
    const next = this.with({
      detail: state.detail
        ? { ...state.detail, layout }
        : undefined,
      axis: {
        ...(state.axis ?? {}),
        layout,
        ...(options.order ? { order: options.order } : {}),
        ...(options.duration != null ? { duration: options.duration } : {}),
        ...(options.stagger ? { stagger: options.stagger } : {})
      } as AxisSpec
    } as Partial<BarViewState>);
    return next.with({} as Partial<BarViewState>, 'axis');
  }

}

function channelFields(channel: ChannelSpec | undefined): string[] {
  if (!channel) return [];
  return [
    channel.field,
    (channel.hue as ChannelSpec | undefined)?.field,
    (channel.luminance as ChannelSpec | undefined)?.field
  ].filter((field): field is string => typeof field === 'string' && field.length > 0);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function aggregateBarState(
  view: BarState,
  config: {
    by?: string | string[];
    groupby?: string | string[];
    segment?: string;
    category?: string;
    categoryTitle?: string;
    value?: string;
    as?: string;
    valueTitle?: string;
    layout?: BarLayout;
    op?: string;
    color?: unknown;
    domain?: unknown[];
    range?: unknown[];
    tooltip?: unknown;
    key?: string | string[];
    semanticKey?: SemanticKey;
    [key: string]: unknown;
  }
): BarState {
  const normalized = normalizeAggregation(config, view.state as BarViewState);
  const { groupby, segment } = normalized;

  if (segment) {
    return view.with({
      key: normalized.key ?? [normalized.category, segment],
      where: clearConstraint((view.state as BarViewState).where ?? [], segment),
      detail: {
        category: normalized.category,
        categoryTitle: normalized.categoryTitle,
        fields: [],
        labels: {},
        segment,
        value: normalized.value,
        valueTitle: normalized.valueTitle,
        layout: normalized.layout ?? 'stacked',
        color: cloneState(normalized.color) as ChannelSpec | undefined,
        domain: normalized.domain as unknown[] | undefined,
        range: normalized.range as unknown[] | undefined,
        source: segment,
        groupby,
        op: normalized.op
      } as DetailSpec,
      __grammar: { measureSelector: null },
      ...(normalized.tooltip ? { encoding: { tooltip: cloneState(normalized.tooltip) } } : {})
    } as Partial<BarViewState>, 'detail');
  }

  return view.with({
    key: normalized.key ?? (groupby.length === 1 ? groupby[0] : groupby),
    detail: null,
    axis: null,
    semanticKey: normalized.semanticKey ?? null,
    where: (view.state as BarViewState).where,
    transform: [
      ...((view.state as BarViewState).transform ?? []),
      {
        aggregate: {
          groupby,
          fields: [{ op: normalized.op, field: normalized.value, as: normalized.as }]
        }
      }
    ],
    __grammar: { measureSelector: null }
  } as Partial<BarViewState>, 'detail');
}

function normalizeSelectors(
  selector: string | Record<string, unknown> | FilterSpec
): FilterSpec[] {
  if (typeof selector === 'string') return [normalizeFilter(selector)];
  const sel = selector as Record<string, unknown>;
  if (sel.field) return [cloneState(normalizeFilter(sel))];
  return Object.entries(sel).map(([field, equal]) => ({ field, equal }));
}

function setConstraints(constraints: FilterSpec[], selectors: FilterSpec[]): FilterSpec[] {
  const fields = new Set(selectors.map((s) => s.field));
  const next = constraints.filter((c) => !fields.has(c.field));
  return [...next, ...selectors.map(cloneState)];
}

function clearConstraint(constraints: FilterSpec[], field: string): FilterSpec[] {
  return constraints.filter((c) => c.field !== field);
}

function identityFromSelectors(
  state: BarViewState,
  selectors: FilterSpec[]
): Partial<BarViewState> | null {
  const category = state.encoding?.x?.field;
  const measure = selectors.find(
    (s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field)
  );
  if (!category || !measure) return null;
  return {
    key: [category, measure.field],
    semanticKey: {
      entity: { field: category },
      measure: { field: measure.field }
    }
  };
}

function measureTitleFromSelectors(state: BarViewState, selectors: FilterSpec[]): string | null {
  const y = state.encoding?.y;
  if (!y?.field) return null;
  const measure = selectors.find(
    (s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field)
  );
  if (!measure) return null;

  const currentTitle = y.title ?? titleize(y.field);
  const previousMeasureTitle = (state as Record<string, unknown>).__grammar
    ? ((state as Record<string, unknown>).__grammar as Record<string, unknown>)?.measureSelector
      ? ((
          (state as Record<string, unknown>).__grammar as Record<string, unknown>
        ).measureSelector as { title?: string })?.title
      : undefined
    : undefined;

  const titleCanFollowSelector =
    currentTitle === titleize(y.field) || currentTitle === previousMeasureTitle;
  return titleCanFollowSelector ? labelFromValue(measure.equal) : null;
}

function isMeasureSelectorField(field: string): boolean {
  return (
    field === 'type' ||
    field === 'kind' ||
    field.endsWith('_type') ||
    field.endsWith('_kind')
  );
}

function normalizeAggregation(
  config: Record<string, unknown>,
  state: BarViewState
): {
  groupby: string[];
  category: string | null;
  categoryTitle: string;
  segment: string | undefined;
  value: string;
  as: string;
  valueTitle: string;
  op: string;
  layout?: BarLayout;
  color?: unknown;
  domain?: unknown;
  range?: unknown;
  tooltip?: unknown;
  key?: string | string[];
  semanticKey?: SemanticKey;
} {
  const xField = state.encoding?.x?.field;
  const yField = state.encoding?.y?.field;
  const groupby = asArray((config.by ?? config.groupby ?? xField) as string | string[] | null).filter(Boolean) as string[];
  const value = (config.value ?? config.field ?? yField ?? 'value') as string;
  const as = (config.as ?? value) as string;
  const op = (config.op ?? config.use ?? 'sum') as string;
  const segment = (config.segment ?? groupby.find((f) => f !== xField)) as string | undefined;
  const category = (config.category ?? xField ?? groupby.find((f) => f !== segment)) as string | null;

  return {
    ...config,
    groupby,
    category,
    categoryTitle: (config.categoryTitle ?? titleize(category ?? '')) as string,
    segment,
    value,
    as,
    valueTitle: (config.valueTitle ?? (segment
      ? titleize(value)
      : state.encoding?.y?.title ?? titleize(as))) as string,
    op
  };
}

function asArray<T>(value: T | T[] | null | undefined): (T | undefined)[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function pruneAuthoringState(spec: ViewSpec): ViewSpec {
  const next = cloneState(spec) as ViewSpec;
  delete next.margin;
  const state = (next.meta as Record<string, unknown> | undefined)?.state as
    | Record<string, unknown>
    | undefined;
  if (!state) return next;

  const sceneState = (state.sceneState ?? {}) as Record<string, unknown>;
  const preservedSceneState: Record<string, unknown> = {};

  const selection = sceneState.selection ?? state.selection;
  const axis = sceneState.axis ?? state.axis;

  if ((selection as Record<string, unknown> | undefined)?.mode === 'highlight') {
    preservedSceneState.selection = selection;
  }
  if (hasCustomAxisOrder(axis as Record<string, unknown> | null)) {
    const g = axis as Record<string, unknown>;
    preservedSceneState.axis = {
      ...(g.layout ? { layout: g.layout } : {}),
      ...(g.orientation ? { orientation: g.orientation } : {}),
      ...(g.order ? { order: g.order } : {}),
      ...(g.duration != null ? { duration: g.duration } : {}),
      ...(g.stagger ? { stagger: g.stagger } : {})
    };
  }

  delete state.selection;
  delete state.axis;
  delete state.detail;
  state.sceneState = preservedSceneState;
  if (!Object.keys(state.sceneState as object).length) delete state.sceneState;
  if (!Object.keys(state).length) delete (next.meta as Record<string, unknown>).state;
  if (next.meta && !Object.keys(next.meta as object).length) delete next.meta;
  return next;
}

function hasCustomAxisOrder(axis: Record<string, unknown> | null): boolean {
  if (!axis) return false;
  if (axis.duration != null || axis.stagger != null) return true;
  if (!Array.isArray(axis.order)) return false;
  return (axis.order as string[]).join('|') !== defaultAxisOrder(axis).join('|');
}

function defaultAxisOrder(axis: Record<string, unknown>): string[] {
  return axis.orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}
