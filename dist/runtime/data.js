import { dataName } from '../spec-meta.js';
export async function loadData(dataSpec, d3) {
    if (!d3) {
        throw new Error('VisDelta data loading requires D3. Pass { d3 } to transition() or the driver runtime.');
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
    // Domain inference uses the full, unsorted data lineage. Display-only
    // filtering/limiting/sorting must not reassign categorical palette slots or
    // reorder the legend. Marks still use the complete transform pipeline.
    // Keep fold/bin/timeUnit/aggregate: these define the values being encoded.
    return transforms.filter((transform) => {
        const t = transform;
        return !('filter' in t) && !('limit' in t) && !('sort' in t);
    });
}
