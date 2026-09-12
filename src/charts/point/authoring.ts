import type { AxisSpec, ViewSpec } from '../../types/index.js';
import { ChartState, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createPointSpecCompiler } from './compile.js';
import { chartModule as pointModule } from './module.js';

const POINT_SPEC_COMPILER = createPointSpecCompiler();

export interface PointViewState extends ViewSpec {
  mark: 'point';
  size?: number;
}

export function point(data?: unknown): PointState {
  return new PointState({ data: normalizeDataSource(data) as PointViewState['data'], mark: 'point', encoding: {} });
}

export class PointState extends ChartState<PointViewState> {
  chartModule() {
    return pointModule;
  }

  protected override compileSpec(spec: ViewSpec): ViewSpec {
    return compileViewWithCompiler(spec, { scene: [] }, POINT_SPEC_COMPILER);
  }

  pointSize(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Point size must be a positive finite number.');
    }
    return this.with({ size: value });
  }

  radius(value: number): this {
    return this.pointSize(value);
  }

  flip(options: Record<string, unknown> = {}): this {
    return this.axis({
      flip: true,
      ...(options['x'] ? { x: options['x'] } : {}),
      ...(options['y'] ? { y: options['y'] } : {}),
      ...(options['order'] ? { order: options['order'] as Array<'x' | 'y'> } : {}),
      ...(options['duration'] != null ? { duration: options['duration'] as number } : {}),
      ...(options['stagger'] ? { stagger: options['stagger'] as AxisSpec['stagger'] } : {})
    });
  }

  rollup(groupby: string | string[] | null, options: Record<string, unknown> = {}): this {
    const fields = Array.isArray(groupby) ? groupby : [groupby].filter(Boolean) as string[];
    const key = options['key'] || (fields.length === 1 ? fields[0] : fields);
    return this.replaceState('detail', definedState({
        mode: 'aggregate',
        groupby: fields,
        key,
        x: options['x'],
        y: options['y'],
        size: options['size']
    }), 'detail') as this;
  }

  breakdown(detail: string | Record<string, unknown> | null = null, options: Record<string, unknown> = {}): this {
    const config = detail && typeof detail === 'object'
      ? detail as Record<string, unknown>
      : { detail, ...options };
    const detailKey = config['detail'] || this.state['key'];
    const previousGroupby = (this.state.detail as Record<string, unknown> | undefined)?.['groupby'];
    const previousParent = Array.isArray(previousGroupby) && previousGroupby.length === 1
      ? previousGroupby[0]
      : previousGroupby;
    return this.replaceState('detail', definedState({
        mode: 'detail',
        key: config['key'] || detailKey,
        detail: detailKey,
        parentField: config['parentField'] || previousParent
    }), 'detail') as this;
  }
}

function definedState(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}
