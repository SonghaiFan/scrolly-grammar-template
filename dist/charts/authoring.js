import { serializeViewSpec } from '../spec-meta.js';
import { ViewState, cloneState } from '../grammar/view-state.js';
import { titleize } from '../labels.js';
import { normalizeFilter } from '../data/filter.js';
export { titleize };
// ─── Data source normalisation ────────────────────────────────────────────────
//
// Observable-Plot style: pass a URL (string or { url }) directly to bar() etc.
//
//   bar('/data/weather.csv').x('decade').y('count')
//   bar({ url: '/data/weather.csv', type: 'csv' }).x(...).y(...)
//
// A plain non-URL string is treated as a named dataset reference (existing
// behavior). Standalone transition() resolves inline URLs directly; a driver
// may additionally provide named sources through its own data map.
export function normalizeDataSource(data) {
    if (typeof data === 'string' && isDataUrl(data)) {
        return { url: data };
    }
    return data;
}
function isDataUrl(s) {
    return (s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('./') ||
        s.startsWith('../') ||
        s.startsWith('/') ||
        /\.(csv|json|tsv|arrow)(\?.*)?$/i.test(s));
}
// ─── ChartState ───────────────────────────────────────────────────────────────
export class ChartState extends ViewState {
    toSpec() {
        return compileAuthoredView(this.compileSpec(serializeViewSpec(super.toSpec())));
    }
    /** Chart subclasses override this without importing the global chart manifest. */
    compileSpec(spec) {
        return spec;
    }
    data(data) {
        // A data binding replaces the old source (including URL/inline metadata).
        const spec = cloneState(this.state);
        spec.data = normalizeDataSource(data);
        const Ctor = this.constructor;
        return new Ctor(spec);
    }
    x(field, options = {}) {
        return this.channel('x', field, { type: 'quantitative', ...options });
    }
    y(field, options = {}) {
        return this.channel('y', field, { type: 'quantitative', ...options });
    }
    channel(name, field, options = {}) {
        return this.with({
            encoding: { [name]: channelFrom(field, options) }
        });
    }
    color(valueOrField, options = {}) {
        return this.with({ encoding: { color: colorFrom(valueOrField, options) } });
    }
    size(field, options = {}) {
        return this.channel('size', field, { type: 'quantitative', ...options });
    }
    key(fields) {
        const value = Array.isArray(fields) && fields.length === 1 ? fields[0] : fields;
        return this.with({ key: value });
    }
    tooltip(items) {
        const list = Array.isArray(items) ? items : [items];
        return this.with({
            encoding: {
                tooltip: cloneState(list.map((item) => typeof item === 'string' ? { field: item, title: titleize(item) } : item))
            }
        });
    }
    sort(field, order = 'ascending') {
        return this.with({
            transform: [
                ...(this.state.transform ?? []),
                { sort: { field, order } }
            ]
        });
    }
    transition(timing) {
        return this.with({ transition: timing });
    }
    where(selector) {
        return this.with({ selection: selectorFrom(selector) }, 'selection');
    }
    highlight(selector, options = {}) {
        return this.with({
            selection: {
                mode: 'highlight',
                filter: selectorFrom(selector),
                ...(options.opacity != null ? { opacity: options.opacity } : {})
            }
        }, 'selection');
    }
    /** Configure the chart axes, scales, orientation, and transition order. */
    axis(config = {}) {
        return this.with({ axis: cloneState(config) }, 'axis');
    }
}
function compileAuthoredView(spec) {
    return pruneAuthoringSpec(spec);
}
// ─── Channel factories ────────────────────────────────────────────────────────
export function channelFrom(field, options = {}) {
    if (field && typeof field === 'object') {
        const channel = { ...field, ...options };
        return {
            ...channel,
            ...(channel.field && !channel.title ? { title: titleize(channel.field) } : {})
        };
    }
    return {
        field: field,
        title: titleize(field),
        ...options
    };
}
export function colorFrom(valueOrField, options = {}) {
    if (valueOrField && typeof valueOrField === 'object')
        return cloneState(valueOrField);
    if (typeof valueOrField === 'string' && valueOrField.startsWith('#'))
        return { value: valueOrField };
    return options.value
        ? { value: options.value }
        : { field: valueOrField, type: 'nominal', ...options };
}
export function selectorFrom(selector = {}) {
    if (typeof selector === 'string')
        return normalizeFilter(selector);
    const sel = selector;
    if (sel.field)
        return cloneState(normalizeFilter(sel));
    const entries = Object.entries(sel);
    if (entries.length === 1) {
        const [field, equal] = entries[0];
        return { field, equal };
    }
    throw new Error('Use a single field comparison for this chart selector.');
}
// ─── Spec pruning ─────────────────────────────────────────────────────────────
function pruneAuthoringSpec(spec) {
    const next = pruneEmpty(cloneState(spec));
    if (Array.isArray(next.transform) && !next.transform.length)
        delete next.transform;
    const state = next.meta?.state;
    if (!state)
        return next;
    const sceneState = (state.sceneState ?? {});
    if (!sceneState.axis && shouldPreserveAxisState(state.axis)) {
        sceneState.axis = state.axis;
    }
    delete state.selection;
    delete state.axis;
    delete state.detail;
    state.sceneState = sceneState;
    pruneSceneStateDefaults(state.sceneState);
    state.sceneState = pruneEmpty(state.sceneState);
    if (!Object.keys(state.sceneState).length)
        delete state.sceneState;
    if (!Object.keys(state).length)
        delete next.meta.state;
    if (next.meta && !Object.keys(next.meta).length)
        delete next.meta;
    return pruneEmpty(next);
}
function pruneSceneStateDefaults(sceneState) {
    const axis = sceneState.axis;
    if (axis) {
        if (axis.xScale === 'linear')
            delete axis.xScale;
        if (axis.yScale === 'linear')
            delete axis.yScale;
        if (isDefaultOrder(axis))
            delete axis.order;
    }
}
function shouldPreserveAxisState(axis) {
    if (!axis || typeof axis !== 'object' || Array.isArray(axis))
        return false;
    const semanticKeys = ['layout', 'x', 'y', 'group', 'value'];
    return semanticKeys.some((k) => axis[k] != null);
}
function isDefaultOrder(axis) {
    if (!Array.isArray(axis.order))
        return false;
    if (axis.duration != null || axis.stagger != null)
        return false;
    return axis.order.join('|') === 'x|y';
}
function pruneEmpty(value) {
    if (Array.isArray(value)) {
        return value.map(pruneEmpty).filter((item) => item !== undefined);
    }
    if (!isPlainObject(value))
        return value == null ? undefined : value;
    const entries = Object.entries(value)
        .map(([k, v]) => [k, pruneEmpty(v)])
        .filter(([, v]) => v !== undefined)
        .filter(([, v]) => !isPlainObject(v) || Object.keys(v).length > 0);
    return Object.fromEntries(entries);
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
