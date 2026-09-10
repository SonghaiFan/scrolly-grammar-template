import { keyAccessor } from '../../identity/semantic-key.js';
import { specState } from '../../spec-meta.js';
export function pointKeyAccessor(spec, fallbackField = 'id') {
    const rawKey = keyAccessor(spec, fallbackField);
    const mode = specState(spec).sceneState?.['detail'];
    const detailMode = mode?.['mode'];
    if (!detailMode)
        return rawKey;
    return (row, index) => `${detailMode}:${rawKey(row, index)}`;
}
export function pointStoredKey(datum, index, key) {
    return datum['__slPointJoinKey'] || key(datum, index);
}
export function applyPointIdentity(selection, key) {
    const sel = selection;
    return sel
        .each(function (d, i) {
        d['__slPointJoinKey'] = key(d, i);
    })
        .attr('data-key', (d, i) => key(d, i));
}
