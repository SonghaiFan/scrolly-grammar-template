import { specObjectKey, specSemanticKey, specState } from '../../spec-meta.js';
import { barOffsetChannelName, barOrientationFromEncoding } from './layout/index.js';
import { barSegmentField } from './semantic.js';
import { channelFromField, cloneEncoding, compileFilter, compileHighlight, identitySpec, resolveAxisOrder, withObject, withSceneState } from '../compiler-utils.js';
export function createBarSpecCompiler(_context = {}) {
    return {
        base: compileBarBase,
        operations: {
            filter: compileFilter,
            highlight: compileHighlight,
            coordinate: compileBarCoordinate,
            scale: compileBarScale,
            aggregate: compileBarAggregate,
            layout: compileBarLayout
        }
    };
}
function compileBarBase(spec, _context = {}) {
    return withDefaultBarSemanticKey(identitySpec(spec));
}
function compileBarCoordinate(spec, axisSpec = {}, _context = {}) {
    let workingSpec = spec;
    const layout = axisSpec['layout'] || null;
    const flipsOrientation = Boolean(axisSpec['flip']);
    if (axisSpec['layout']) {
        const segmentField = barSegmentField(workingSpec);
        const state = specState(workingSpec);
        const stateRecord = state;
        const detail = stateRecord['sceneState']?.['detail'] || stateRecord['detail'] || {};
        const orientation = flipsOrientation
            ? oppositeOrientation(barOrientationFromEncoding(workingSpec.encoding || {}))
            : barOrientationFromEncoding(workingSpec.encoding || {});
        workingSpec = withSceneState({
            ...workingSpec,
            encoding: encodingWithBarLayout(workingSpec.encoding, layout, segmentField, orientation)
        }, {
            axis: { layout, ...resolveAxisOrder(axisSpec, orientation) },
            ...(segmentField ? { detail: { ...detail, layout } } : {})
        });
        if (!flipsOrientation && !axisSpec['scale'])
            return workingSpec;
    }
    let encoding = cloneEncoding(workingSpec.encoding);
    const currentOrientation = barOrientationFromEncoding(encoding);
    const catCh = categoryChannel(encoding);
    const measCh = measureChannel(encoding);
    const category = channelFromField(catCh, catCh?.title || null, 'nominal');
    const measure = channelFromField(measCh, measCh?.title || null, 'quantitative');
    const orientation = flipsOrientation ? oppositeOrientation(currentOrientation) : currentOrientation;
    if (orientation === 'horizontal') {
        encoding['x'] = { ...measure, ...(axisSpec['scale'] ? { domain: axisSpec['scale']['domain'] } : {}) };
        encoding['y'] = category;
    }
    else {
        encoding['x'] = category;
        encoding['y'] = { ...measure, ...(axisSpec['scale'] ? { domain: axisSpec['scale']['domain'] } : {}) };
    }
    const state = specState(workingSpec);
    const stateRecord = state;
    const resolvedLayout = layout ||
        stateRecord['sceneState']?.['detail'] && stateRecord['sceneState']['detail']?.['layout'] ||
        stateRecord['detail']?.['layout'] ||
        stateRecord['sceneState']?.['axis'] && stateRecord['sceneState']['axis']?.['layout'] ||
        stateRecord['axis']?.['layout'] ||
        null;
    encoding = encodingWithBarLayout(encoding, resolvedLayout, barSegmentField(workingSpec), orientation);
    return withSceneState(withObject({
        ...workingSpec,
        margin: {
            ...(orientation === 'horizontal' ? { left: 86, right: 42 } : {}),
            ...(workingSpec['margin'] || {})
        },
        encoding: encoding
    }, {
        key: axisSpec['key'] || specObjectKey(workingSpec) || category.field || ''
    }), {
        axis: {
            ...(resolvedLayout ? { layout: resolvedLayout } : {}),
            orientation,
            ...(flipsOrientation ? { flip: true } : {}),
            scale: axisSpec['scale'] || null,
            ...resolveAxisOrder(axisSpec, orientation)
        }
    });
}
function compileBarScale(spec, operationSpec = {}, context = {}) {
    return compileBarCoordinate(spec, operationSpec, context);
}
function compileBarLayout(spec, operationSpec = {}, context = {}) {
    return compileBarCoordinate(spec, operationSpec, context);
}
function compileBarAggregate(spec, detailSpec = {}, _context = {}) {
    const encoding = spec.encoding || {};
    const categoryField = detailSpec['category'] || encoding['x']?.field || 'category';
    const segmentField = detailSpec['segment'] || detailSpec['segmentAs'] || 'segment';
    const valueField = detailSpec['value'] || detailSpec['valueAs'] || encoding['y']?.field || 'value';
    const sourceField = detailSpec['source'] || detailSpec['sourceAs'] || '__measure';
    const fields = detailSpec['fields'] || [];
    const labels = detailSpec['labels'] || {};
    const segmentDomain = detailSpec['domain'] ||
        detailSpec['color']?.['domain'] ||
        fields.map((field) => labels[field] || field);
    const groupby = detailSpec['groupby'] || [categoryField, sourceField, segmentField];
    const transform = [...(spec.transform || [])];
    if (fields.length) {
        transform.push({ fold: { fields, as: [segmentField, valueField], sourceAs: sourceField, labels } });
    }
    if (detailSpec['aggregate'] !== false) {
        transform.push({
            aggregate: {
                groupby,
                fields: [{ op: detailSpec['op'] || 'sum', field: valueField, as: valueField }]
            }
        });
    }
    const layout = detailSpec['layout'] || 'stacked';
    const color = explicitDetailColor(detailSpec['color'], encoding['color'], segmentField, segmentDomain, detailSpec['range']);
    const newEncoding = {
        ...cloneEncoding(spec.encoding),
        x: channelFromField(categoryField, detailSpec['categoryTitle'] || encoding['x']?.title || null, 'nominal'),
        y: channelFromField(valueField, detailSpec['valueTitle'] || encoding['y']?.title || null, 'quantitative'),
        detail: { field: segmentField, type: 'nominal' },
        ...(color ? { color } : {})
    };
    if (layout === 'grouped') {
        newEncoding['xOffset'] = { field: segmentField, type: 'nominal' };
    }
    else {
        delete newEncoding['xOffset'];
        delete newEncoding['yOffset'];
    }
    return withSceneState(withObject({
        ...spec,
        transform,
        encoding: newEncoding
    }, {
        key: detailSpec['key'] || [categoryField, segmentField],
        semantic: detailSpec['semantic'] ||
            detailSpec['semanticKey'] ||
            semanticKeyFromParts({ field: categoryField }, { field: sourceField })
    }), {
        detail: {
            layout,
            fields,
            segmentField,
            sourceField,
            segments: segmentDomain.length ? segmentDomain : null,
            valueField
        }
    });
}
function explicitDetailColor(requested, inherited, segmentField, segmentDomain, range) {
    if (requested === false)
        return undefined;
    if (Array.isArray(requested)) {
        return {
            field: segmentField,
            type: 'nominal',
            ...(segmentDomain.length ? { domain: segmentDomain } : {}),
            range: requested
        };
    }
    if (requested && typeof requested === 'object') {
        const channel = requested;
        return {
            ...(!channel.field && !channel.value && !channel.hue && !channel.luminance
                ? { field: segmentField, type: 'nominal' }
                : {}),
            ...channel
        };
    }
    if (range?.length) {
        return {
            field: segmentField,
            type: 'nominal',
            ...(segmentDomain.length ? { domain: segmentDomain } : {}),
            range
        };
    }
    return inherited;
}
function withDefaultBarSemanticKey(spec) {
    if (specSemanticKey(spec))
        return spec;
    const semanticKey = semanticKeyFromEncoding(spec.encoding || {});
    return semanticKey ? withObject(spec, { semantic: semanticKey }) : spec;
}
function encodingWithBarLayout(encoding = {}, layout = 'stacked', segmentField = null, orientation = barOrientationFromEncoding(encoding)) {
    const next = cloneEncoding(encoding);
    if (layout === 'grouped' && segmentField) {
        delete next['xOffset'];
        delete next['yOffset'];
        next[barOffsetChannelName(orientation)] = { field: segmentField, type: 'nominal' };
        return next;
    }
    delete next['xOffset'];
    delete next['yOffset'];
    return next;
}
function semanticKeyFromEncoding(encoding, previousSemanticKey = null) {
    const cat = categoryChannel(encoding);
    const meas = measureChannel(encoding);
    if (!cat?.field || !meas?.field)
        return previousSemanticKey;
    return semanticKeyFromParts((previousSemanticKey?.['entity'] || previousSemanticKey?.['entities'] || { field: cat.field }), { value: meas.field });
}
function semanticKeyFromParts(entity, measure) {
    return { entity, measure };
}
function categoryChannel(encoding = {}) {
    if (['nominal', 'ordinal'].includes(encoding['x']?.type || ''))
        return encoding['x'];
    if (['nominal', 'ordinal'].includes(encoding['y']?.type || ''))
        return encoding['y'];
    return encoding['x']?.field ? encoding['x'] : encoding['y'] || null;
}
function measureChannel(encoding = {}) {
    if (encoding['y']?.type === 'quantitative')
        return encoding['y'];
    if (encoding['x']?.type === 'quantitative')
        return encoding['x'];
    return encoding['y']?.field ? encoding['y'] : encoding['x'] || null;
}
function oppositeOrientation(orientation) {
    return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}
