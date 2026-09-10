import { ChartState, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createPointSpecCompiler } from './compile.js';
const POINT_SPEC_COMPILER = createPointSpecCompiler();
export function point(data) {
    return new PointState({ data: normalizeDataSource(data), mark: 'point', encoding: {} });
}
export class PointState extends ChartState {
    compileSpec(spec) {
        return compileViewWithCompiler(spec, { scene: [] }, POINT_SPEC_COMPILER);
    }
    x(field, options = {}) {
        return super.x(field, { type: 'quantitative', ...options });
    }
    y(field, options = {}) {
        return super.y(field, { type: 'quantitative', ...options });
    }
    pointSize(value) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error('Point size must be a positive finite number.');
        }
        return this.with({ size: value });
    }
    radius(value) {
        return this.pointSize(value);
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
    rollup(groupby, options = {}) {
        const fields = Array.isArray(groupby) ? groupby : [groupby].filter(Boolean);
        const key = options['key'] || (fields.length === 1 ? fields[0] : fields);
        return this.with({
            detail: definedState({
                mode: 'aggregate',
                groupby: fields,
                key,
                x: options['x'],
                y: options['y'],
                countAs: options['countAs'],
                sizeRange: options['sizeRange']
            })
        }, 'detail');
    }
    breakdown(detail = null, options = {}) {
        const config = detail && typeof detail === 'object'
            ? detail
            : { detail, ...options };
        const detailKey = config['detail'] || this.state['key'];
        return this.with({
            detail: definedState({
                mode: 'detail',
                key: config['key'] || detailKey,
                detail: detailKey
            })
        }, 'detail');
    }
}
function definedState(value) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
