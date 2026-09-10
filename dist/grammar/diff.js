import { specObjectKey, specSemanticKey, specState } from '../spec-meta.js';
import { appendBarSemanticDeltas, semanticBarState } from '../charts/bar/diff.js';
export function diffViewStates(previous, next) {
    const prev = toComparableSpec(previous);
    const curr = toComparableSpec(next);
    const changed = [];
    if (!sameValue(prev.mark, curr.mark))
        changed.push('mark');
    if (!sameValue(prev.data, curr.data))
        changed.push('data');
    if (!sameValue(prev.key, curr.key))
        changed.push('key');
    if (!sameValue(prev.transform, curr.transform))
        changed.push('transform');
    if (!sameValue(prev.filter, curr.filter))
        changed.push('filter');
    for (const channel of encodingChannels(prev, curr)) {
        if (!sameValue(prev.encoding?.[channel], curr.encoding?.[channel]))
            changed.push(`encoding.${channel}`);
    }
    if (!sameValue(prev.axis, curr.axis))
        changed.push('axis');
    if (!sameValue(prev.detail, curr.detail))
        changed.push('detail');
    const semantic = diffSemanticViewStates(prev, curr);
    return {
        changed,
        has: (key) => changed.includes(key),
        deltas: semantic.deltas,
        delta: (type) => (semantic.deltas.find((d) => d.type === type) ?? null),
        hasDelta: (type, action = null) => semantic.deltas.some((d) => d.type === type && (action == null || d.action === action)),
        semantic,
        previous: semantic.previous,
        next: semantic.next
    };
}
function toComparableSpec(value) {
    if (!value)
        return {};
    return typeof value.toSpec === 'function'
        ? value.toSpec()
        : value;
}
export function sameValue(a, b) {
    return JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b));
}
function canonicalValue(value) {
    if (value == null)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value))
        return value.map(canonicalValue);
    if (typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalValue(item)]));
}
function encodingChannels(a, b) {
    return [...new Set([...Object.keys(a.encoding ?? {}), ...Object.keys(b.encoding ?? {})])].sort();
}
export function diffSemanticViewStates(previous = {}, next = {}) {
    const prev = toSemanticState(previous);
    const curr = toSemanticState(next);
    const deltas = [];
    pushDelta(deltas, 'mark', prev.mark, curr.mark);
    pushDelta(deltas, 'data', previous.data, next.data);
    pushDelta(deltas, 'key', prev.key, curr.key);
    pushDelta(deltas, 'semantic-key', prev.semanticKey, curr.semanticKey);
    pushCollectionDelta(deltas, 'filter', prev.filters, curr.filters);
    pushDelta(deltas, 'transform', prev.nonFilterTransforms, curr.nonFilterTransforms);
    for (const channel of encodingChannels(previous, next)) {
        pushDelta(deltas, `encoding.${channel}`, prev.encoding[channel], curr.encoding[channel]);
    }
    pushStateDelta(deltas, 'selection', prev.selection, curr.selection);
    pushStateDelta(deltas, 'axis', prev.axis, curr.axis);
    pushStateDelta(deltas, 'detail', prev.detail, curr.detail);
    if (prev.mark === 'bar' || curr.mark === 'bar') {
        appendBarSemanticDeltas(deltas, prev, curr, { pushDelta, pushStateDelta });
    }
    return {
        previous: prev,
        next: curr,
        deltas,
        has: (type, action = null) => deltas.some((d) => d.type === type && (action == null || d.action === action)),
        get: (type) => (deltas.find((d) => d.type === type) ?? null)
    };
}
function toSemanticState(spec) {
    const stateFields = specState(spec);
    const sceneState = stateFields.sceneState ?? {};
    const transforms = (spec.transform ?? []);
    const state = {
        mark: spec.mark ?? null,
        key: specObjectKey(spec),
        semanticKey: specSemanticKey(spec),
        encoding: (spec.encoding ?? {}),
        filters: [
            ...(spec.filter ? [spec.filter] : []),
            ...transforms.filter((t) => t.filter).map((t) => t.filter)
        ],
        nonFilterTransforms: transforms.filter((t) => !t.filter),
        selection: sceneState.selection ?? stateFields.selection ?? null,
        axis: sceneState.axis ?? stateFields.axis ?? null,
        detail: (sceneState.detail ?? stateFields.detail ?? null)
    };
    if (String(spec.mark ?? '').toLowerCase() === 'bar') {
        state.bar = semanticBarState(spec, stateFields);
    }
    return state;
}
export function pushStateDelta(deltas, type, previous, next) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: deltaAction(previous, next), previous: previous ?? null, next: next ?? null });
}
export function pushDelta(deltas, type, previous, next) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: 'change', previous: previous ?? null, next: next ?? null });
}
function pushCollectionDelta(deltas, type, previous = [], next = []) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: collectionDeltaAction(previous, next), previous, next });
}
function deltaAction(previous, next) {
    if (previous == null && next != null)
        return 'add';
    if (previous != null && next == null)
        return 'remove';
    return 'change';
}
function collectionDeltaAction(previous, next) {
    if (!previous.length && next.length)
        return 'add';
    if (previous.length && !next.length)
        return 'remove';
    return 'change';
}
