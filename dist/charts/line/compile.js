import { compileCartesianCoordinate, compileCartesianScale, compileFilter, compileHighlight, identitySpec, selectorToFilter, withSceneState } from '../compiler-utils.js';
export function createLineSpecCompiler(_context = {}) {
    return {
        base: compileLineBase,
        operations: {
            filter: compileLineFilter,
            highlight: compileHighlight,
            coordinate: compileLineCoordinate,
            scale: compileLineScale,
            aggregate: compileLineAggregate,
            layout: compileLineLayout,
            series: compileLineSeries
        }
    };
}
function compileLineBase(spec, _context = {}) {
    return identitySpec(spec);
}
function compileLineFilter(spec, selectionSpec = {}, _context = {}) {
    const filter = selectionSpec['filter'] || selectorToFilter(selectionSpec);
    if (!filter)
        return spec;
    if (selectionSpec['mode'] === 'filter' || selectionSpec['mode'] === 'highlight') {
        return selectionSpec['mode'] === 'highlight'
            ? compileHighlight(spec, selectionSpec)
            : compileFilter(spec, selectionSpec);
    }
    return withSceneState({ ...spec }, {
        selection: {
            filter,
            mode: selectionSpec['mode'] || 'rangeCrop',
            crop: selectionSpec['crop'] !== false
        }
    });
}
function compileLineCoordinate(spec, operationSpec = {}, _context = {}) {
    return compileCartesianCoordinate(spec, operationSpec);
}
function compileLineScale(spec, operationSpec = {}, _context = {}) {
    return compileCartesianScale(spec, operationSpec);
}
function compileLineAggregate(spec, detailSpec = {}, context = {}) {
    return compileLineSeries(spec, detailSpec, context);
}
function compileLineSeries(spec, detailSpec = {}, _context = {}) {
    const mode = detailSpec['mode'] || 'series';
    const encoding = { ...(spec.encoding || {}) };
    const seriesField = detailSpec['series'] ||
        detailSpec['field'] ||
        encoding['color']?.['field'];
    if (mode === 'series' && seriesField) {
        encoding['color'] = detailSpec['color'] || {
            field: seriesField,
            type: 'nominal',
            range: detailSpec['range'] || [
                'var(--sl-series-1)',
                'var(--sl-series-2)',
                'var(--sl-series-3)'
            ]
        };
    }
    if (mode === 'single' && detailSpec['color']) {
        encoding['color'] = detailSpec['color'];
    }
    return withSceneState({ ...spec, encoding: encoding }, {
        detail: {
            mode,
            seriesField: mode === 'series' ? seriesField : null
        }
    });
}
function compileLineLayout(spec, _operationSpec = {}, _context = {}) {
    return spec;
}
