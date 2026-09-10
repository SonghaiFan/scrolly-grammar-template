import { ChartState, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createLineSpecCompiler } from './compile.js';
const LINE_SPEC_COMPILER = createLineSpecCompiler();
export function line(data) {
    return new LineState({ data: normalizeDataSource(data), mark: 'line', encoding: {} });
}
export class LineState extends ChartState {
    compileSpec(spec) {
        return compileViewWithCompiler(spec, { scene: [] }, LINE_SPEC_COMPILER);
    }
    x(field, options = {}) {
        return super.x(field, { type: 'nominal', ...options });
    }
    y(field, options = {}) {
        return super.y(field, { type: 'quantitative', ...options });
    }
    curve(value) {
        return this.with({ curve: value });
    }
    strokeWidth(value) {
        return this.with({ strokeWidth: value });
    }
    pointSize(value) {
        return this.with({ pointSize: value });
    }
    flip(options = {}) {
        return this.axis({
            flip: true,
            ...(options['x'] ? { x: options['x'] } : {}),
            ...(options['y'] ? { y: options['y'] } : {}),
            ...(options['order'] ? { order: options['order'] } : {}),
            ...(options['duration'] != null ? { duration: options['duration'] } : {}),
            ...(options['stagger'] ? { stagger: options['stagger'] } : {})
        });
    }
    breakdown(field, options = {}) {
        return this.with({
            detail: {
                mode: 'series',
                series: field,
                ...(options['color']
                    ? Array.isArray(options['color'])
                        ? { range: options['color'] }
                        : { color: colorFrom(options['color']) }
                    : {}),
                ...(options['range'] ? { range: options['range'] } : {})
            }
        }, 'detail');
    }
    rollup(groupbyOrOptions = {}) {
        const options = groupbyOrOptions && typeof groupbyOrOptions === 'object'
            ? groupbyOrOptions
            : {};
        return this.with({
            detail: {
                mode: 'single',
                ...(options['color'] ? { color: colorFrom(options['color']) } : {})
            }
        }, 'detail');
    }
}
