import { diffViewStates, sameValue } from './diff.js';
/** Classify endpoint semantics only; builder provenance is not animation input. */
export function inferTransition(previous, next) {
    if (!previous || !next)
        return [];
    const diff = diffViewStates(previous, next);
    const scenes = [];
    const layoutOnly = onlyDetailLayoutChanged(diff.delta('bar.detail') ?? diff.delta('detail'));
    const aggregateChanged = !sameValue(diff.previous.nonFilterTransforms.filter(t => 'aggregate' in t || 'bin' in t), diff.next.nonFilterTransforms.filter(t => 'aggregate' in t || 'bin' in t));
    const detail = !layoutOnly && (diff.hasDelta('detail') || diff.hasDelta('bar.detail') || aggregateChanged);
    const prev = diff.previous.encoding;
    const curr = diff.next.encoding;
    const swapped = Boolean(prev.x?.field && prev.y?.field && prev.x.field !== prev.y.field &&
        prev.x.field === curr.y?.field && prev.y.field === curr.x?.field);
    const fieldChanged = ['x', 'y'].some(channel => prev[channel]?.field && curr[channel]?.field && prev[channel]?.field !== curr[channel]?.field);
    const coordinatesChanged = ['x', 'y'].some(channel => !sameValue(coordinates(prev[channel]), coordinates(curr[channel])));
    if (diff.hasDelta('filter') || diff.hasDelta('selection'))
        scenes.push('selection');
    // A pure axis swap changes reading direction, not the selected variables.
    // Generated aggregate fields belong to detail rather than mapping.
    if (fieldChanged && !swapped && !detail)
        scenes.push('mapping');
    if (detail)
        scenes.push('detail');
    if (swapped || coordinatesChanged || layoutOnly || diff.hasDelta('axis') || diff.hasDelta('bar.axis'))
        scenes.push('axis');
    return scenes;
}
function coordinates(channel) {
    if (!channel)
        return null;
    return { scale: channel.scale ?? null, domain: channel.domain ?? null, sort: channel.sort ?? null };
}
function onlyDetailLayoutChanged(delta) {
    if (!delta?.previous || !delta?.next)
        return false;
    const { layout: previousLayout, ...previous } = delta.previous;
    const { layout: nextLayout, ...next } = delta.next;
    return sameValue(previous, next) && !sameValue(previousLayout, nextLayout);
}
