import { specState } from '../../spec-meta.js';
import { filterPredicate } from '../../data/filter.js';
export function lineState(spec = {}, enc = {}) {
    const state = specState(spec);
    const detail = state.sceneState?.['detail'] ?? {};
    return {
        selection: (state.sceneState?.['selection'] || state.selection || null),
        seriesField: detail['seriesField'] || enc['color']?.field || null
    };
}
export function lineSeries(rows, seriesField) {
    if (!seriesField)
        return [{ key: '__line', rows }];
    const grouped = new Map();
    rows.forEach((row) => {
        const key = String(row[seriesField] ?? '__missing');
        if (!grouped.has(key))
            grouped.set(key, []);
        grouped.get(key).push(row);
    });
    return Array.from(grouped, ([key, values]) => ({ key, rows: values }));
}
export function selectedLineXScale(rows, channel, chart, selection, deps) {
    const { bandOrLinear, d3, niceExtent, position } = deps;
    const baseRange = [0, chart['innerWidth']];
    if (!selection?.filter || selection['mode'] !== 'rangeCrop') {
        return bandOrLinear(rows, channel, baseRange, d3);
    }
    const selectedRows = rows.filter(filterPredicate(selection.filter));
    if (selectedRows.length < 2) {
        return bandOrLinear(rows, channel, baseRange, d3);
    }
    const base = bandOrLinear(rows, channel, baseRange, d3);
    if (channel?.type === 'quantitative' || channel?.type === 'temporal') {
        const domain = selectedDomain(selectedRows, channel, d3, niceExtent);
        return bandOrLinear(rows, { ...channel, domain }, baseRange, d3);
    }
    const positionFn = position;
    const positions = selectedRows
        .map((row) => positionFn(base, row[channel?.field ?? '']))
        .filter(Number.isFinite);
    if (positions.length < 2)
        return base;
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    if (min === max)
        return base;
    const innerWidth = chart['innerWidth'];
    const inset = Math.min(innerWidth * 0.08, 44);
    const factor = (innerWidth - inset * 2) / (max - min);
    return bandOrLinear(rows, channel, [inset - min * factor, inset + (innerWidth - min) * factor], d3);
}
function selectedDomain(rows, channel, d3, niceExtent) {
    const d3Obj = d3;
    if (channel.type === 'temporal') {
        return d3Obj['extent'](rows, (d) => new Date(d[channel.field]));
    }
    return niceExtent(rows, channel.field);
}
