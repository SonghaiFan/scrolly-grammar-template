import { defaultTransition } from './timing.js';
export const SPEC_META_KEY = 'meta';
const INTERNAL_STATE_FIELDS = ['selection', 'detail', 'axis', 'sceneState'];
export function getSpecMeta(spec) {
    return mergeSpecMeta(spec[SPEC_META_KEY] ?? {});
}
export function withSpecMeta(spec, extension) {
    return {
        ...spec,
        [SPEC_META_KEY]: mergeSpecMeta(getSpecMeta(spec), extension)
    };
}
export function serializeViewSpec(spec) {
    if (!spec)
        return spec;
    const next = clonePlain(spec);
    const meta = getSpecMeta(next);
    delete next[SPEC_META_KEY];
    if (next.key !== undefined) {
        meta.object = { ...(meta.object ?? {}), key: next.key };
        delete next.key;
    }
    if (next.semanticKey !== undefined) {
        meta.object = {
            ...(meta.object ?? {}),
            semantic: semanticToMeta(next.semanticKey)
        };
        delete next.semanticKey;
    }
    if (next.transition !== undefined) {
        meta.transition = { ...(meta.transition ?? {}), ...clonePlain(next.transition) };
        delete next.transition;
    }
    if (next.scroll !== undefined) {
        meta.action = { ...(meta.action ?? {}), scroll: clonePlain(next.scroll) };
        delete next.scroll;
    }
    if (next.unit !== undefined) {
        meta.unit = clonePlain(next.unit);
        delete next.unit;
    }
    const state = { ...(meta.state ?? {}) };
    for (const field of INTERNAL_STATE_FIELDS) {
        if (next[field] !== undefined) {
            state[field] = next[field];
            delete next[field];
        }
    }
    const sceneState = { ...(state.sceneState ?? {}) };
    delete next.barLayout;
    delete next.segmentField;
    delete next.segmentDomain;
    delete next.aggregate;
    if (Object.keys(sceneState).length)
        state.sceneState = sceneState;
    if (Object.keys(state).length)
        meta.state = state;
    const metaTransforms = meta.transform;
    if (metaTransforms?.length) {
        next.transform = dedupeArray([...(next.transform ?? []), ...metaTransforms]);
        delete meta.transform;
    }
    pruneDefaultSpecMeta(meta);
    if (typeof next.data === 'string') {
        next.data = { name: next.data };
    }
    if (Object.keys(meta).length) {
        next[SPEC_META_KEY] = meta;
    }
    return next;
}
export function normalizeViewSpec(spec) {
    const meta = getSpecMeta(spec);
    const state = meta.state ?? {};
    const object = meta.object ?? {};
    const transforms = [
        ...(spec.transform ?? []),
        ...(meta.transform ?? [])
    ];
    const { meta: _meta, ...baseSpec } = spec;
    return {
        ...baseSpec,
        key: object.key ?? (spec.encoding?.key?.field ?? null),
        semanticKey: semanticFromMeta(object.semantic) ?? null,
        transition: (meta.transition ?? {}),
        scroll: meta.action?.scroll,
        unit: meta.unit ?? null,
        selection: state.selection ?? null,
        axis: state.axis ?? null,
        detail: state.detail ?? null,
        sceneState: state.sceneState ?? {},
        ...(transforms.length ? { transform: dedupeArray(transforms) } : {})
    };
}
export function specObjectKey(spec) {
    const meta = getSpecMeta(spec);
    return meta.object?.key ?? spec.encoding?.key?.field ?? null;
}
export function specSemanticKey(spec) {
    const meta = getSpecMeta(spec);
    return semanticFromMeta(meta.object?.semantic) ?? null;
}
export function specTransition(spec) {
    const meta = getSpecMeta(spec);
    return meta.transition ?? {};
}
export function specScroll(spec) {
    const meta = getSpecMeta(spec);
    return meta.action?.scroll ?? null;
}
export function specUnit(spec) {
    const meta = getSpecMeta(spec);
    return meta.unit ?? null;
}
export function specState(spec) {
    const meta = getSpecMeta(spec);
    const state = meta.state ?? {};
    return {
        selection: state.selection ?? null,
        axis: state.axis ?? null,
        detail: state.detail ?? null,
        sceneState: state.sceneState ?? {}
    };
}
export function dataName(dataSpec) {
    if (typeof dataSpec === 'string')
        return dataSpec;
    return dataSpec?.name ?? null;
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function mergeSpecMeta(...items) {
    return items.reduce((merged, item) => mergePlain(merged, item ?? {}), {});
}
function mergePlain(base, next) {
    const merged = { ...clonePlain(base) };
    for (const [key, value] of Object.entries(next ?? {})) {
        if (isPlainObject(value) && isPlainObject(merged[key])) {
            merged[key] = mergePlain(merged[key], value);
        }
        else {
            merged[key] = clonePlain(value);
        }
    }
    return merged;
}
function semanticToMeta(semanticKey = {}) {
    return {
        ...(semanticKey.entity !== undefined ? { entity: semanticPartToMeta(semanticKey.entity) } : {}),
        ...(semanticKey.entities !== undefined ? { entity: semanticPartToMeta(semanticKey.entities) } : {}),
        ...(semanticKey.measure !== undefined ? { measure: semanticPartToMeta(semanticKey.measure) } : {}),
        ...(semanticKey.measures !== undefined ? { measure: semanticPartToMeta(semanticKey.measures) } : {})
    };
}
function semanticFromMeta(semantic) {
    if (!semantic)
        return null;
    return {
        ...(semantic.entity !== undefined ? { entity: semanticPartFromMeta(semantic.entity) } : {}),
        ...(semantic.measure !== undefined ? { measure: semanticPartFromMeta(semantic.measure) } : {})
    };
}
function semanticPartToMeta(part) {
    if (Array.isArray(part))
        return part.map(semanticPartToMeta);
    if (typeof part === 'string')
        return { field: part };
    return clonePlain(part);
}
function semanticPartFromMeta(part) {
    if (Array.isArray(part))
        return part.map(semanticPartFromMeta);
    const p = part;
    if (p?.field)
        return p.field;
    if (p?.value)
        return { value: p.value };
    return clonePlain(part);
}
function pruneDefaultSpecMeta(meta) {
    if (meta.transition !== undefined) {
        const pruned = diffFromDefaultTransition(meta.transition);
        if (!Object.keys(pruned).length) {
            delete meta.transition;
        }
        else {
            meta.transition = pruned;
        }
    }
}
function diffFromDefaultTransition(transition) {
    const defaults = defaultTransition();
    const diff = {};
    for (const [key, value] of Object.entries(transition ?? {})) {
        if (key === 'stagger' &&
            isPlainObject(value) &&
            isPlainObject(defaults.stagger)) {
            const staggerDiff = diffPlain(value, defaults.stagger);
            if (Object.keys(staggerDiff).length)
                diff.stagger = staggerDiff;
        }
        else if (!sameValue(value, defaults[key])) {
            diff[key] = clonePlain(value);
        }
    }
    return diff;
}
function diffPlain(value, defaults) {
    const result = {};
    for (const [key, child] of Object.entries(value ?? {})) {
        if (!sameValue(child, defaults[key]))
            result[key] = clonePlain(child);
    }
    return result;
}
function sameValue(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
function clonePlain(value) {
    if (value == null || typeof value !== 'object')
        return value;
    return JSON.parse(JSON.stringify(value));
}
function dedupeArray(values) {
    const seen = new Set();
    return values.filter((value) => {
        const key = JSON.stringify(value ?? null);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
