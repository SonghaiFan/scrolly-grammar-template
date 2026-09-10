import { ChartState, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createUnitSpecCompiler } from './compile.js';
import { chartModule as unitModule } from './module.js';
const UNIT_SPEC_COMPILER = createUnitSpecCompiler();
export function unit(data) {
    return new UnitState({ data: normalizeDataSource(data), mark: 'unit', encoding: {}, unit: {} });
}
export class UnitState extends ChartState {
    chartModule() {
        return unitModule;
    }
    compileSpec(spec) {
        return compileViewWithCompiler(spec, { scene: [] }, UNIT_SPEC_COMPILER, { axis: 'layout' });
    }
    value(field, options = {}) {
        return this.with({
            unit: {
                ...(this.state['unit'] || {}),
                value: field,
                ...(options.maxUnits ? { maxUnits: options.maxUnits } : {})
            }
        });
    }
    label(field) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), label: field }
        });
    }
    columns(value) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), columns: value }
        });
    }
    radius(value) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), radius: value }
        });
    }
    group(field, options = {}) {
        const { color, ...layoutOptions } = options;
        return withUnitAxis(this, {
            layout: 'groupedGrid',
            group: field,
            ...layoutOptions,
            ...(color ? { color: colorFrom(color) } : {})
        });
    }
    timeline(field, options = {}) {
        return withUnitAxis(this, {
            layout: 'timeline',
            ...unitAxisChannel(this, 'x', field, options)
        });
    }
    dodge(field, options = {}) {
        return withUnitAxis(this, {
            layout: 'dodge',
            ...unitAxisChannel(this, 'x', field, options)
        });
    }
}
function withUnitAxis(state, axis) {
    return state.axis(axis);
}
function unitAxisChannel(state, channel, field, options = {}) {
    const { title, type, ...rest } = options;
    const current = state.state['encoding']?.[channel];
    if ((field == null || field === current?.field) && title == null && type == null) {
        return rest;
    }
    return {
        [channel]: {
            field,
            type: type || 'quantitative',
            ...(title ? { title } : {})
        },
        ...rest
    };
}
