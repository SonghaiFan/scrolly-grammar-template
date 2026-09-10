import { specObjectKey } from '../../spec-meta.js';
import { titleize } from '../../labels.js';
import { colorField } from './encoding.js';
import { aggregateFieldSpec, compileCartesianCoordinate, compileCartesianScale, compileFilter, compileHighlight, identitySpec, mergeXYChannel, withObject, withSceneState } from '../compiler-utils.js';
export function createPointSpecCompiler(_context = {}) {
    return {
        base: compilePointBase,
        operations: {
            filter: compileFilter,
            highlight: compileHighlight,
            coordinate: compilePointCoordinate,
            scale: compilePointScale,
            aggregate: compilePointAggregate,
            layout: compilePointLayout
        }
    };
}
function compilePointBase(spec, _context = {}) {
    return identitySpec(spec);
}
function compilePointCoordinate(spec, operationSpec = {}, _context = {}) {
    return compileCartesianCoordinate(spec, operationSpec);
}
function compilePointScale(spec, operationSpec = {}, _context = {}) {
    return compileCartesianScale(spec, operationSpec);
}
function compilePointAggregate(spec, detailSpec = {}, _context = {}) {
    const mode = detailSpec['mode'] || 'detail';
    const authoredGroupby = normalizeFields(detailSpec['groupby']);
    const parentField = detailSpec['parentField'] ||
        parentFromGroupby(authoredGroupby) ||
        colorField(spec.encoding);
    const detail = detailSpec['detail'] ||
        specObjectKey(spec) ||
        spec.encoding?.['key']?.field ||
        spec.encoding?.['x']?.field;
    if (mode === 'aggregate') {
        const groupby = authoredGroupby.length ? authoredGroupby : [parentField].filter(Boolean);
        const x = mergeXYChannel(spec.encoding?.['x'], detailSpec['x'] || spec.encoding?.['x'], 'quantitative');
        const y = mergeXYChannel(spec.encoding?.['y'], detailSpec['y'] || spec.encoding?.['y'], 'quantitative');
        const xAs = detailSpec['x']?.as || x.field;
        const yAs = detailSpec['y']?.as || y.field;
        const countAs = detailSpec['countAs'] || 'count';
        const xAggregate = aggregateFieldSpec(detailSpec['x'], x.field, xAs, 'mean');
        const yAggregate = aggregateFieldSpec(detailSpec['y'], y.field, yAs, 'mean');
        const fields = [xAggregate, yAggregate, { op: 'count', as: countAs }];
        return withSceneState(withObject({
            ...spec,
            transform: [...(spec.transform || []), { aggregate: { groupby, fields } }],
            encoding: {
                ...spec.encoding,
                x: { ...x, field: xAs, title: detailSpec['x']?.title || aggregateTitle(xAggregate.op, x.title || x.field) },
                y: { ...y, field: yAs, title: detailSpec['y']?.title || aggregateTitle(yAggregate.op, y.title || y.field) },
                ...(detailSpec['size'] !== false
                    ? { size: { field: countAs, type: 'quantitative', ...(detailSpec['sizeRange'] ? { range: detailSpec['sizeRange'] } : {}) } }
                    : {})
            }
        }, { key: detailSpec['key'] || groupby }), {
            detail: { mode, groupby, countAs }
        });
    }
    return withSceneState(withObject({ ...spec }, {
        key: detailSpec['key'] || detail
    }), {
        detail: {
            mode: 'detail',
            detail,
            ...(parentField ? { parentField } : {})
        }
    });
}
function compilePointLayout(spec, _operationSpec = {}, _context = {}) {
    return spec;
}
function aggregateTitle(op, title) {
    if (!op || op === 'sum' || new RegExp(`^${op}\\s`, 'i').test(title))
        return titleize(title);
    return `${titleize(op)} ${lowerFirst(titleize(title))}`;
}
function lowerFirst(value) {
    return String(value || '').replace(/^\w/, (letter) => letter.toLowerCase());
}
function normalizeFields(value) {
    if (value == null)
        return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}
function parentFromGroupby(groupby) {
    if (!groupby.length)
        return null;
    return groupby.length === 1 ? groupby[0] : groupby;
}
