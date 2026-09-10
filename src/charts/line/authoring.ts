import type { AxisSpec, ViewSpec } from '../../types/index.js';
import { ChartState, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createLineSpecCompiler } from './compile.js';
import { chartModule as lineModule } from './module.js';

const LINE_SPEC_COMPILER = createLineSpecCompiler();

export interface LineViewState extends ViewSpec {
  mark: 'line';
  curve?: string;
  strokeWidth?: number;
  pointSize?: number;
}

export function line(data?: unknown): LineState {
  return new LineState({ data: normalizeDataSource(data) as LineViewState['data'], mark: 'line', encoding: {} });
}

export class LineState extends ChartState<LineViewState> {
  chartModule() {
    return lineModule;
  }

  protected override compileSpec(spec: ViewSpec): ViewSpec {
    return compileViewWithCompiler(spec, { scene: [] }, LINE_SPEC_COMPILER);
  }

  override x(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.x(field, { type: 'nominal', ...options });
  }

  override y(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.y(field, { type: 'quantitative', ...options });
  }

  curve(value: string): this {
    return this.with({ curve: value });
  }

  strokeWidth(value: number): this {
    return this.with({ strokeWidth: value });
  }

  pointSize(value: number): this {
    return this.with({ pointSize: value });
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

  breakdown(field: string, options: Record<string, unknown> = {}): this {
    return this.with({
      detail: {
        mode: 'series',
        series: field,
        ...(options['color']
          ? Array.isArray(options['color'])
            ? { range: options['color'] as unknown[] }
            : { color: colorFrom(options['color'] as string) }
          : {}),
        ...(options['range'] ? { range: options['range'] as unknown[] } : {})
      }
    }, 'detail') as this;
  }

  rollup(groupbyOrOptions: Record<string, unknown> = {}): this {
    const options = groupbyOrOptions && typeof groupbyOrOptions === 'object'
      ? groupbyOrOptions
      : {};
    return this.with({
      detail: {
        mode: 'single',
        ...(options['color'] ? { color: colorFrom(options['color'] as string) } : {})
      }
    }, 'detail') as this;
  }
}
