import { filterPredicate } from './filter.js';
import { validateTransforms } from './validate.js';
export function applyTransforms(source, transforms = [], aq) {
    validateTransforms(transforms);
    if (!transforms.length)
        return source.map((row) => ({ ...row }));
    if (!aq) {
        throw new Error('ScrollyLite data transforms require Arquero. Pass { aq } to the runtime.');
    }
    const fields = [...new Set(source.flatMap(row => Object.keys(row)))];
    let table = aq.from(source.map(row => Object.fromEntries(fields.map(field => [field, row[field]]))));
    transforms.forEach((transform) => {
        const t = transform;
        if (t['filter'])
            table = filterRows(table, t['filter'], aq);
        if (t['timeUnit'])
            table = timeUnitRows(table, t['timeUnit'], aq);
        if (t['fold'])
            table = foldRows(table, t['fold'], aq);
        if (t['bin'])
            table = binRows(table, t['bin'], aq);
        if (t['aggregate'])
            table = aggregateRows(table, t['aggregate'], aq);
        if (t['sort'])
            table = sortRows(table, t['sort'], aq);
        if ('limit' in t)
            table = table.slice(0, t['limit']);
    });
    return table.objects();
}
function timeUnitRows(table, timeUnit, aq) {
    const as = timeUnit.as || `${timeUnit.field}_${timeUnit.unit}`;
    return table.derive({
        [as]: aq.escape((row) => monthLabel(row[timeUnit.field]))
    });
}
function monthLabel(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return String(value ?? '');
    return date.toLocaleString('en', { month: 'short' });
}
function filterRows(table, filter, aq) {
    return table.filter(aq.escape(filterPredicate(filter)));
}
function foldRows(table, fold, aq) {
    const fields = fold.fields || [];
    const [keyAs = 'key', valueAs = 'value'] = fold.as || [];
    const sourceAs = fold.sourceAs || '__foldField';
    const labelAs = fold.labelAs || keyAs;
    let folded = table.fold(fields, { as: [sourceAs, valueAs] });
    if (sourceAs !== keyAs || fold.labels) {
        const labels = fold.labels || {};
        folded = folded.derive({
            [labelAs]: aq.escape((row) => labels[row[sourceAs]] ?? row[sourceAs])
        });
    }
    return folded;
}
function binRows(table, bin, aq) {
    const as = bin.as || `${bin.field}_bin`;
    const startAs = `${as}_start`;
    const endAs = `${as}_end`;
    const rows = table.objects();
    const numeric = (value) => value == null || value === '' || typeof value === 'boolean' ? NaN : Number(value);
    const values = rows.map((row) => numeric(row[bin.field])).filter(Number.isFinite);
    const min = values.length ? values.reduce((a, b) => Math.min(a, b)) : 0;
    const max = values.length ? values.reduce((a, b) => Math.max(a, b)) : 0;
    const step = bin.step ?? Math.max(1, Math.ceil((max - min) / (bin.maxbins ?? 10)));
    return table.derive({
        [startAs]: aq.escape((row) => {
            const value = numeric(row[bin.field]);
            if (!Number.isFinite(value))
                return null;
            return Math.floor((value - min) / step) * step + min;
        }),
        [endAs]: aq.escape((row) => {
            const value = numeric(row[bin.field]);
            if (!Number.isFinite(value))
                return null;
            return Math.floor((value - min) / step) * step + min + step;
        }),
        [as]: aq.escape((row) => {
            const value = numeric(row[bin.field]);
            if (!Number.isFinite(value))
                return null;
            const start = Math.floor((value - min) / step) * step + min;
            return `${start}-${start + step}`;
        })
    });
}
function aggregateRows(table, aggregate, aq) {
    const groupby = aggregate.groupby || [];
    const fields = aggregate.fields || [{ op: 'count', as: 'count' }];
    const values = Object.fromEntries(fields.map((fieldSpec) => [
        fieldSpec.as || `${fieldSpec.op || 'count'}_${fieldSpec.field || 'rows'}`,
        aggregateExpression(fieldSpec, aq)
    ]));
    return table.groupby(...groupby).rollup(values);
}
function aggregateExpression(fieldSpec, aq) {
    const op = fieldSpec.op || 'count';
    const field = fieldSpec.field || '';
    if (op === 'count')
        return aq.op.count();
    if (op === 'mean')
        return aq.op.mean(field);
    if (op === 'min')
        return aq.op.min(field);
    if (op === 'max')
        return aq.op.max(field);
    if (op === 'median')
        return aq.op.median(field);
    if (op === 'sum')
        return aq.op.sum(field);
    throw new Error(`Unsupported aggregate operator: ${op}`);
}
function sortRows(table, sort, aq) {
    if (Array.isArray(sort.fields)) {
        return table.orderby(...sort.fields.map((field) => sortField(field, aq)));
    }
    return table.orderby(sortField(sort, aq));
}
function sortField(sort, aq) {
    if (typeof sort === 'string')
        return sort;
    if (sort.order === 'descending')
        return aq.desc(sort.field || '');
    return sort.field;
}
