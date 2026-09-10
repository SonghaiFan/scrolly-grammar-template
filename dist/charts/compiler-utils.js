import { specObjectKey, withSpecMeta } from '../spec-meta.js';
import { titleize } from '../labels.js';
import { normalizeFilter } from '../data/filter.js';
export function compileFilter(spec, operationSpec = {}) {
    const filter = operationSpec.filter ? normalizeFilter(operationSpec.filter) : selectorToFilter(operationSpec);
    if (!filter)
        return spec;
    return withSceneState({
        ...spec,
        transform: [{ filter }, ...(spec.transform || [])]
    }, { selection: { filter } });
}
export function compileHighlight(spec, operationSpec = {}) {
    const filter = operationSpec.filter ? normalizeFilter(operationSpec.filter) : selectorToFilter(operationSpec);
    if (!filter)
        return spec;
    return withSceneState(spec, {
        selection: {
            mode: 'highlight',
            filter,
            ...(operationSpec.opacity != null ? { opacity: operationSpec.opacity } : {})
        }
    });
}
export function compileCartesianCoordinate(spec, operationSpec = {}) {
    const encoding = cloneEncoding(spec.encoding);
    const shouldFlip = Boolean(operationSpec['flip']);
    if (shouldFlip) {
        [encoding['x'], encoding['y']] = [encoding['y'], encoding['x']];
    }
    if (operationSpec['x'])
        encoding['x'] = mergeXYChannel(encoding['x'], operationSpec['x'], 'quantitative');
    if (operationSpec['y'])
        encoding['y'] = mergeXYChannel(encoding['y'], operationSpec['y'], 'quantitative');
    return withSceneState(withObject({ ...spec, encoding }, {
        key: operationSpec['key'] || specObjectKey(spec)
    }), {
        axis: {
            flip: shouldFlip,
            xScale: channelScaleType(encoding['x']),
            yScale: channelScaleType(encoding['y']),
            ...resolveAxisOrder(operationSpec, 'cartesian')
        }
    });
}
export function compileCartesianScale(spec, operationSpec = {}) {
    return compileCartesianCoordinate(spec, operationSpec);
}
export function identitySpec(spec) {
    return spec;
}
export function withObject(spec, objectSpec = {}) {
    const object = {};
    if (objectSpec.key != null)
        object['key'] = objectSpec.key;
    if (objectSpec.semantic != null)
        object['semantic'] = semanticToMeta(objectSpec.semantic);
    return Object.keys(object).length ? withSpecMeta(spec, { object: object }) : spec;
}
export function withSceneState(spec, sceneStatePatch = {}) {
    return withSpecMeta(spec, { state: { sceneState: sceneStatePatch } });
}
export function semanticToMeta(semanticKey = {}) {
    const sk = semanticKey;
    return {
        ...(sk['entity'] !== undefined ? { entity: semanticPartToMeta(sk['entity']) } : {}),
        ...(sk['entities'] !== undefined ? { entity: semanticPartToMeta(sk['entities']) } : {}),
        ...(sk['measure'] !== undefined ? { measure: semanticPartToMeta(sk['measure']) } : {}),
        ...(sk['measures'] !== undefined ? { measure: semanticPartToMeta(sk['measures']) } : {})
    };
}
export function semanticPartToMeta(part) {
    if (Array.isArray(part))
        return part.map(semanticPartToMeta);
    if (typeof part === 'string')
        return { field: part };
    if (part == null || typeof part !== 'object')
        return part;
    return { ...part };
}
export function selectorToFilter(selector = {}) {
    if (!selector['field'])
        return null;
    return normalizeFilter({
        field: selector['field'],
        ...copyDefined(selector, ['equal', 'notEqual', 'oneOf', 'gte', 'gt', 'lte', 'lt'])
    });
}
export function resolveAxisOrder(axisSpec = {}, orientation) {
    return {
        order: axisSpec['order'] ||
            (orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y']),
        duration: axisSpec['duration'],
        stagger: axisSpec['stagger']
    };
}
export function channelFromField(fieldOrChannel, title, fallbackType) {
    if (fieldOrChannel && typeof fieldOrChannel === 'object') {
        const channel = { ...fieldOrChannel };
        if (!channel.type)
            channel.type = fallbackType;
        if (channel.field && !channel.title)
            channel.title = titleize(channel.field);
        return channel;
    }
    return {
        field: fieldOrChannel,
        type: fallbackType,
        title: title || titleize(fieldOrChannel)
    };
}
export function mergeXYChannel(base = {}, override = {}, fallbackType) {
    if (typeof override === 'string')
        return channelFromField(override, null, fallbackType);
    const channel = { ...base, ...override };
    if (!channel.type)
        channel.type = fallbackType;
    if (channel.field && (!channel.title || override.field)) {
        channel.title = override.title || titleize(channel.field);
    }
    if (override.scale || base.scale) {
        channel.scale = {
            ...(base.scale || {}),
            ...(override.scale || {})
        };
    }
    return channel;
}
export function channelScaleType(channel = {}) {
    const ch = channel;
    return ch.scale?.type || ch.scaleType || 'linear';
}
export function aggregateFieldSpec(channelSpec = {}, fallbackField, fallbackAs, fallbackOp) {
    const ch = channelSpec;
    return {
        op: ch.op || fallbackOp,
        field: ch.field || fallbackField,
        as: ch.as || fallbackAs
    };
}
export function cloneViewSpec(viewSpec) {
    return {
        ...viewSpec,
        transform: [...(viewSpec.transform || [])],
        encoding: cloneEncoding(viewSpec.encoding)
    };
}
export function cloneEncoding(encoding = {}) {
    return Object.fromEntries(Object.entries(encoding || {}).map(([channel, channelSpec]) => [
        channel,
        Array.isArray(channelSpec)
            ? channelSpec.map((item) => ({ ...item }))
            : { ...channelSpec }
    ]));
}
export function copyDefined(source, keys) {
    return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}
