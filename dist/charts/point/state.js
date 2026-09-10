import { cloneState } from '../../grammar/view-state.js';
import { specState, withSpecMeta } from '../../spec-meta.js';
import { colorField } from './encoding.js';
export function pointState(spec = {}, enc = {}) {
    const state = specState(spec);
    const detail = state.sceneState?.['detail']
        || state.detail
        || {};
    return {
        parentField: parentFromGroupby(detail['groupby']) || detail['parentField'] || colorField(enc),
        detailMode: detail['mode'] || null
    };
}
/** Compile summary/detail as one reversible path: summary -> detail. */
export function canonicalPointTransitionPair(previousSpec, nextSpec) {
    const previousGroup = aggregateGroup(previousSpec);
    const nextGroup = aggregateGroup(nextSpec);
    const previousIsSummary = previousGroup.length > 0;
    const nextIsSummary = nextGroup.length > 0;
    if (previousIsSummary !== nextIsSummary && previousIsSummary) {
        return {
            from: previousSpec,
            to: withParentField(nextSpec, previousGroup),
            reverse: false
        };
    }
    if (previousIsSummary !== nextIsSummary) {
        return {
            from: nextSpec,
            to: withParentField(previousSpec, nextGroup),
            reverse: true
        };
    }
    // A state produced by flip() is the canonical destination. Re-authoring the
    // same pair in the opposite direction therefore evaluates that path at 1-p.
    const previousFlip = pointAxisState(previousSpec)?.['flip'] === true;
    const nextFlip = pointAxisState(nextSpec)?.['flip'] === true;
    if (previousFlip && !nextFlip) {
        return { from: nextSpec, to: previousSpec, reverse: true };
    }
    return { from: previousSpec, to: nextSpec, reverse: false };
}
/** Split a point flip into the authored first axis and then the second axis. */
export function pointIntermediateSpecs(previousSpec, nextSpec) {
    const axis = pointAxisState(nextSpec);
    if (!axis?.['flip'])
        return [];
    const previousEncoding = previousSpec.encoding || {};
    const nextEncoding = nextSpec.encoding || {};
    const changed = ['x', 'y'].filter((part) => JSON.stringify(previousEncoding[part]) !== JSON.stringify(nextEncoding[part]));
    if (changed.length < 2)
        return [];
    const order = normalizeAxisOrder(axis['order']);
    const first = order.find((part) => changed.includes(part)) || changed[0];
    const second = changed.find((part) => part !== first);
    if (!second)
        return [];
    const intermediate = cloneState(nextSpec);
    intermediate.encoding = {
        ...cloneState(nextEncoding),
        [second]: cloneState(previousEncoding[second])
    };
    return [{ spec: intermediate, scene: 'axis' }];
}
export function parentAnchors(rows, parentField, positionForRow) {
    const grouped = new Map();
    rows.forEach((row) => {
        const key = parentKey(row, parentField);
        const point = positionForRow(row);
        if (!grouped.has(key))
            grouped.set(key, { x: 0, y: 0, count: 0 });
        const anchor = grouped.get(key);
        anchor.x += point.x;
        anchor.y += point.y;
        anchor.count += 1;
    });
    return new Map(Array.from(grouped, ([key, anchor]) => [
        key,
        { x: anchor.x / anchor.count, y: anchor.y / anchor.count }
    ]));
}
export function parentKey(row, parentField) {
    if (!row || !parentField)
        return '__all';
    if (Array.isArray(parentField))
        return parentField.map((field) => row[field]).join('|');
    return String(row[parentField] ?? '__all');
}
export function radiusScale(rows, channel, fallback, d3, quantitativeDomain) {
    if (!channel?.field)
        return () => fallback;
    const range = channel['range'] || defaultRadiusRange(rows.length);
    const d3Obj = d3;
    const scale = d3Obj['scaleSqrt']();
    const scaleWithDomain = scale.domain(quantitativeDomain(rows, channel, 0)).range(range);
    return (row) => scaleWithDomain(Number(row[channel.field]) || 0);
}
export function defaultPointRadius(count) {
    if (count <= 4)
        return 9;
    if (count <= 12)
        return 7;
    if (count <= 60)
        return 5.5;
    return 4.5;
}
function defaultRadiusRange(count) {
    const radius = defaultPointRadius(count);
    return [Math.max(3, radius * 0.75), Math.max(7, radius * 2.4)];
}
function parentFromGroupby(groupby) {
    if (!groupby)
        return null;
    if (Array.isArray(groupby))
        return groupby.length === 1 ? groupby[0] : groupby;
    return groupby;
}
function aggregateGroup(spec) {
    const detail = pointDetailState(spec);
    if (detail?.['mode'] !== 'aggregate')
        return [];
    const groupby = detail['groupby'];
    if (Array.isArray(groupby))
        return groupby.filter(Boolean).map(String);
    return groupby ? [String(groupby)] : [];
}
function withParentField(spec, groupby) {
    const parentField = groupby.length === 1 ? groupby[0] : groupby;
    return withSpecMeta(cloneState(spec), {
        state: {
            sceneState: {
                detail: {
                    ...pointDetailState(spec),
                    mode: 'detail',
                    parentField
                }
            }
        }
    });
}
function pointAxisState(spec) {
    const state = specState(spec);
    return state.sceneState?.['axis']
        || state.axis
        || null;
}
function pointDetailState(spec) {
    const state = specState(spec);
    return state.sceneState?.['detail']
        || state.detail
        || {};
}
function normalizeAxisOrder(value) {
    const order = Array.isArray(value) ? value.map(String) : [];
    return [...new Set([...order, 'x', 'y'])].filter((part) => part === 'x' || part === 'y');
}
