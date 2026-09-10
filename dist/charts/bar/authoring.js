import { serializeViewSpec } from '../../spec-meta.js';
import { cloneState } from '../../grammar/view-state.js';
import { normalizeFilter } from '../../data/filter.js';
import { labelFromValue, titleize } from '../../labels.js';
import { ChartState, channelFrom, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createBarSpecCompiler } from './compile.js';
import { chartModule as barModule } from './module.js';
export function bar(data) {
    return new BarState({ data: normalizeDataSource(data), mark: 'bar', encoding: {} });
}
const BAR_SPEC_COMPILER = createBarSpecCompiler();
export class BarState extends ChartState {
    chartModule() {
        return barModule;
    }
    toSpec() {
        const spec = cloneState(this.state);
        delete spec.__grammar;
        const filters = [
            ...(spec.where ?? []),
            ...(spec.filter ? [spec.filter] : [])
        ];
        if (filters.length) {
            spec.transform = [
                ...filters.map((filter) => ({ filter })),
                ...(spec.transform ?? [])
            ];
        }
        delete spec.where;
        delete spec.filter;
        if (spec.detail == null)
            delete spec.detail;
        if (spec.axis == null)
            delete spec.axis;
        delete spec.aggregate;
        if (spec.semanticKey == null)
            delete spec.semanticKey;
        return pruneAuthoringState(compileViewWithCompiler(serializeViewSpec(spec), { scene: [] }, BAR_SPEC_COMPILER));
    }
    x(field, options = {}) {
        const channel = channelFrom(field, { type: 'nominal', ...options });
        return this.with({
            key: this.state.key ?? channel.field,
            encoding: { x: channel }
        });
    }
    y(field, options = {}) {
        if (typeof options === 'string')
            options = { title: options };
        const { color, tooltip, ...channelOptions } = options;
        const channel = channelFrom(field, { type: 'quantitative', ...channelOptions });
        return this.with({
            encoding: {
                y: channel,
                ...(color ? { color: colorFrom(color) } : {}),
                ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
            }
        });
    }
    where(selector) {
        if (selector == null) {
            return this.with({ where: [] }, 'selection');
        }
        const selectors = normalizeSelectors(selector);
        const identity = identityFromSelectors(this.state, selectors);
        const measureTitle = measureTitleFromSelectors(this.state, selectors);
        return this.with({
            where: setConstraints(this.state.where ?? [], selectors),
            ...(identity ?? {}),
            ...(measureTitle
                ? {
                    encoding: {
                        y: {
                            ...(this.state.encoding?.y ?? {}),
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
        }, 'selection');
    }
    flip(options = {}) {
        const domain = options.domain ?? options.scale?.domain;
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
    breakdown(segment = 'type', options = {}) {
        const category = options.category ?? this.state.encoding?.x?.field;
        const value = options.value ?? this.state.encoding?.y?.field ?? 'count';
        const { by, category: _cat, value: _val, ...rest } = options;
        const next = aggregateBarState(this, {
            ...rest,
            by: by ?? [category, segment].filter(Boolean),
            segment,
            value,
            layout: options.layout ?? 'stacked',
            op: options.op ?? 'sum'
        });
        return (options.title === false ? next : next.y(value, { title: options.title ?? titleize(value) }));
    }
    rollup(groupbyOrOptions = null, options = {}) {
        if (groupbyOrOptions && typeof groupbyOrOptions === 'object' && !Array.isArray(groupbyOrOptions)) {
            options = groupbyOrOptions;
            groupbyOrOptions = options.groupby ?? options.by ?? null;
        }
        const parent = groupbyOrOptions ?? options.groupby ?? options.by
            ?? this.state.encoding?.x?.field;
        const fields = asArray(parent).filter(Boolean);
        const value = options.value ?? this.state.encoding?.y?.field ?? 'count';
        const { color, title, by: _by, groupby: _groupby, value: _value, ...rest } = options;
        let nextState = aggregateBarState(this, {
            ...rest,
            groupby: fields,
            value,
            as: options.as ?? value,
            op: options.op ?? 'sum'
        });
        if (!color) {
            const next = cloneState(nextState.state);
            const colorFields = channelFields(next.encoding?.color);
            if (colorFields.some((field) => !fields.includes(field))) {
                delete next.encoding?.color;
                nextState = new BarState(next);
            }
        }
        if (title)
            nextState = nextState.y(value, { title });
        if (color)
            nextState = nextState.color(color);
        return nextState;
    }
    segment(fieldOrConfig = {}, maybeConfig = {}) {
        const config = typeof fieldOrConfig === 'string'
            ? { ...maybeConfig, segment: fieldOrConfig }
            : fieldOrConfig;
        const state = this.state;
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
                groupby: tidy ? [category, segment].filter(Boolean) : config.groupby
            },
            ...(config.tooltip
                ? { encoding: { tooltip: cloneState(config.tooltip) } }
                : {})
        }, 'detail');
    }
    layout(layout, options = {}) {
        const state = this.state;
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
            }
        });
        return next.with({}, 'axis');
    }
}
function channelFields(channel) {
    if (!channel)
        return [];
    return [
        channel.field,
        channel.hue?.field,
        channel.luminance?.field
    ].filter((field) => typeof field === 'string' && field.length > 0);
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function aggregateBarState(view, config) {
    const normalized = normalizeAggregation(config, view.state);
    const { groupby, segment } = normalized;
    if (segment) {
        return view.with({
            key: normalized.key ?? [normalized.category, segment],
            where: clearConstraint(view.state.where ?? [], segment),
            detail: {
                category: normalized.category,
                categoryTitle: normalized.categoryTitle,
                fields: [],
                labels: {},
                segment,
                value: normalized.value,
                valueTitle: normalized.valueTitle,
                layout: normalized.layout ?? 'stacked',
                color: cloneState(normalized.color),
                domain: normalized.domain,
                range: normalized.range,
                source: segment,
                groupby,
                op: normalized.op
            },
            __grammar: { measureSelector: null },
            ...(normalized.tooltip ? { encoding: { tooltip: cloneState(normalized.tooltip) } } : {})
        }, 'detail');
    }
    return view.with({
        key: normalized.key ?? (groupby.length === 1 ? groupby[0] : groupby),
        detail: null,
        axis: null,
        semanticKey: normalized.semanticKey ?? null,
        where: view.state.where,
        transform: [
            ...(view.state.transform ?? []),
            {
                aggregate: {
                    groupby,
                    fields: [{ op: normalized.op, field: normalized.value, as: normalized.as }]
                }
            }
        ],
        __grammar: { measureSelector: null }
    }, 'detail');
}
function normalizeSelectors(selector) {
    if (typeof selector === 'string')
        return [normalizeFilter(selector)];
    const sel = selector;
    if (sel.field)
        return [cloneState(normalizeFilter(sel))];
    return Object.entries(sel).map(([field, equal]) => ({ field, equal }));
}
function setConstraints(constraints, selectors) {
    const fields = new Set(selectors.map((s) => s.field));
    const next = constraints.filter((c) => !fields.has(c.field));
    return [...next, ...selectors.map(cloneState)];
}
function clearConstraint(constraints, field) {
    return constraints.filter((c) => c.field !== field);
}
function identityFromSelectors(state, selectors) {
    const category = state.encoding?.x?.field;
    const measure = selectors.find((s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field));
    if (!category || !measure)
        return null;
    return {
        key: [category, measure.field],
        semanticKey: {
            entity: { field: category },
            measure: { field: measure.field }
        }
    };
}
function measureTitleFromSelectors(state, selectors) {
    const y = state.encoding?.y;
    if (!y?.field)
        return null;
    const measure = selectors.find((s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field));
    if (!measure)
        return null;
    const currentTitle = y.title ?? titleize(y.field);
    const previousMeasureTitle = state.__grammar
        ? state.__grammar?.measureSelector
            ? state.__grammar.measureSelector?.title
            : undefined
        : undefined;
    const titleCanFollowSelector = currentTitle === titleize(y.field) || currentTitle === previousMeasureTitle;
    return titleCanFollowSelector ? labelFromValue(measure.equal) : null;
}
function isMeasureSelectorField(field) {
    return (field === 'type' ||
        field === 'kind' ||
        field.endsWith('_type') ||
        field.endsWith('_kind'));
}
function normalizeAggregation(config, state) {
    const xField = state.encoding?.x?.field;
    const yField = state.encoding?.y?.field;
    const groupby = asArray((config.by ?? config.groupby ?? xField)).filter(Boolean);
    const value = (config.value ?? config.field ?? yField ?? 'value');
    const as = (config.as ?? value);
    const op = (config.op ?? config.use ?? 'sum');
    const segment = (config.segment ?? groupby.find((f) => f !== xField));
    const category = (config.category ?? xField ?? groupby.find((f) => f !== segment));
    return {
        ...config,
        groupby,
        category,
        categoryTitle: (config.categoryTitle ?? titleize(category ?? '')),
        segment,
        value,
        as,
        valueTitle: (config.valueTitle ?? (segment
            ? titleize(value)
            : state.encoding?.y?.title ?? titleize(as))),
        op
    };
}
function asArray(value) {
    if (Array.isArray(value))
        return value;
    return value == null ? [] : [value];
}
function pruneAuthoringState(spec) {
    const next = cloneState(spec);
    delete next.margin;
    const state = next.meta?.state;
    if (!state)
        return next;
    const sceneState = (state.sceneState ?? {});
    const preservedSceneState = {};
    const selection = sceneState.selection ?? state.selection;
    const axis = sceneState.axis ?? state.axis;
    if (selection?.mode === 'highlight') {
        preservedSceneState.selection = selection;
    }
    if (hasCustomAxisOrder(axis)) {
        const g = axis;
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
    if (!Object.keys(state.sceneState).length)
        delete state.sceneState;
    if (!Object.keys(state).length)
        delete next.meta.state;
    if (next.meta && !Object.keys(next.meta).length)
        delete next.meta;
    return next;
}
function hasCustomAxisOrder(axis) {
    if (!axis)
        return false;
    if (axis.duration != null || axis.stagger != null)
        return true;
    if (!Array.isArray(axis.order))
        return false;
    return axis.order.join('|') !== defaultAxisOrder(axis).join('|');
}
function defaultAxisOrder(axis) {
    return axis.orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}
