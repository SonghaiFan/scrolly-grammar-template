import { dataName } from '../scrolly-meta.js';
export async function loadData(dataSpec, d3) {
    if (!d3) {
        throw new Error('ScrollyLite data loading requires D3. Pass { d3 } to createStory().');
    }
    const entries = await Promise.all(Object.entries(dataSpec).map(async ([name, source]) => {
        if (Array.isArray(source))
            return [name, source];
        const src = source;
        if (Array.isArray(src['values']))
            return [name, src['values']];
        if (!src['url'])
            return [name, []];
        if ((src['type'] || 'csv') === 'csv') {
            const rows = await d3['csv'](src['url'], d3['autoType']);
            return [name, rows];
        }
        if (src['type'] === 'json') {
            const rows = await d3['json'](src['url']);
            return [name, Array.isArray(rows) ? rows : rows['values'] || []];
        }
        throw new Error(`Unsupported data type for "${name}": ${src['type']}`);
    }));
    return Object.fromEntries(entries);
}
export function viewRows(dataSpec, datasets) {
    if (Array.isArray(dataSpec))
        return dataSpec;
    if (Array.isArray(dataSpec?.['values']))
        return dataSpec['values'];
    const name = dataName(dataSpec);
    return name ? (datasets[name] || []) : [];
}
export function domainTransforms(transforms = []) {
    return transforms.filter((transform) => {
        const t = transform;
        return !t['filter'] && !t['limit'];
    });
}
