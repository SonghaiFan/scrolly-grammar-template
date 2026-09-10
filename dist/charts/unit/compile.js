import { cloneEncoding, compileFilter, compileHighlight, copyDefined, identitySpec, resolveAxisOrder, withObject, withSceneState } from '../compiler-utils.js';
import { specObjectKey, specUnit, withSpecMeta } from '../../spec-meta.js';
export function createUnitSpecCompiler(_context = {}) {
    return {
        base: compileUnitBase,
        operations: {
            filter: compileFilter,
            highlight: compileHighlight,
            layout: compileUnitLayout,
            unitLayout: compileUnitLayout,
            encode: compileUnitEncoding
        }
    };
}
function compileUnitBase(spec, _context = {}) {
    return identitySpec(spec);
}
function compileUnitLayout(spec, axisSpec = {}, _context = {}) {
    const unit = {
        ...(specUnit(spec) || {}),
        ...copyDefined(axisSpec, [
            'layout', 'columns', 'groupColumns', 'radius', 'x', 'y',
            'group', 'value', 'label', 'maxUnits'
        ])
    };
    const encoding = cloneEncoding(spec.encoding);
    if (axisSpec['color'])
        encoding['color'] = axisSpec['color'];
    return withSceneState(withObject(withSpecMeta({ ...spec, encoding: encoding }, { unit }), {
        key: axisSpec['key'] || specObjectKey(spec)
    }), {
        axis: {
            layout: unit['layout'] || 'grid',
            x: unit['x'] || null,
            y: unit['y'] || null,
            group: unit['group'] || null,
            value: unit['value'] || null,
            ...resolveAxisOrder(axisSpec, 'unit')
        }
    });
}
function compileUnitEncoding(spec, operationSpec = {}, context = {}) {
    return compileUnitLayout(spec, operationSpec, context);
}
