import { diffViewStates, sameValue } from './diff.js';
/** Classify endpoint semantics only; builder provenance is not animation input. */
export function inferTransition(previous, next) {
    if (!previous || !next)
        return [];
    const diff = diffViewStates(previous, next);
    const scenes = [];
    const layoutOnly = onlyGranularityLayoutChanged(diff.delta('bar.granularity') ?? diff.delta('granularity'));
    const aggregateChanged = !sameValue(diff.previous.nonFilterTransforms.filter(t => 'aggregate' in t || 'bin' in t), diff.next.nonFilterTransforms.filter(t => 'aggregate' in t || 'bin' in t));
    const granularity = !layoutOnly && (diff.hasDelta('granularity') || diff.hasDelta('bar.granularity') || aggregateChanged);
    const prev = diff.previous.encoding;
    const curr = diff.next.encoding;
    const swapped = Boolean(prev.x?.field && prev.y?.field && prev.x.field !== prev.y.field &&
        prev.x.field === curr.y?.field && prev.y.field === curr.x?.field);
    const fieldChanged = ['x', 'y'].some(channel => prev[channel]?.field && curr[channel]?.field && prev[channel]?.field !== curr[channel]?.field);
    const coordinatesChanged = ['x', 'y'].some(channel => !sameValue(coordinates(prev[channel]), coordinates(curr[channel])));
    if (diff.hasDelta('filter') || diff.hasDelta('focus'))
        scenes.push('focus');
    // A pure axis swap changes reading direction, not the selected variables.
    // Generated aggregate fields belong to granularity rather than observation.
    if (fieldChanged && !swapped && !granularity)
        scenes.push('observation');
    if (granularity)
        scenes.push('granularity');
    if (swapped || coordinatesChanged || layoutOnly || diff.hasDelta('guide') || diff.hasDelta('bar.guide'))
        scenes.push('guide');
    return scenes;
}
function coordinates(channel) {
    if (!channel)
        return null;
    return { scale: channel.scale ?? null, domain: channel.domain ?? null, sort: channel.sort ?? null };
}
function onlyGranularityLayoutChanged(delta) {
    if (!delta?.previous || !delta?.next)
        return false;
    const { layout: previousLayout, ...previous } = delta.previous;
    const { layout: nextLayout, ...next } = delta.next;
    return sameValue(previous, next) && !sameValue(previousLayout, nextLayout);
}
