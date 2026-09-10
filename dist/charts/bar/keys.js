import { keyAccessor, semanticKeyForDatum, semanticMeasureForDatum } from '../../identity/semantic-key.js';
import { specSemanticKey } from '../../spec-meta.js';
export function barKeyAccessor(chart, spec, fallbackField = 'id') {
    const fallback = keyAccessor(spec, fallbackField);
    const matchPlan = chart.transitionPlan?.match;
    if (matchPlan?.mode !== 'semantic' || !specSemanticKey(spec)) {
        return fallback;
    }
    return function semanticJoinKey(d, i) {
        const el = this;
        if (el.dataset?.semanticKey)
            return el.dataset.semanticKey;
        return semanticKeyForDatum(d, spec) ?? fallback.call(this, d, i);
    };
}
export function applyBarIdentity(selection, spec, key, categoryValue) {
    const s = selection;
    return s
        .attr('data-key', function (d, i) {
        return key.call(this, d, i);
    })
        .attr('data-category', categoryValue)
        .attr('data-measure', (d) => semanticMeasureForDatum(d, spec))
        .attr('data-semantic-key', (d) => semanticKeyForDatum(d, spec));
}
