import type { ViewSpec } from '../../types/index.js';
import { ChartState, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createAreaSpecCompiler } from './compile.js';
import { chartModule as areaModule } from './module.js';
import { D3_AREA_CURVE_NAMES, isD3AreaCurveName } from '../curve.js';
import type { D3AreaCurveName } from '../curve.js';

const AREA_SPEC_COMPILER = createAreaSpecCompiler();

export interface AreaViewState extends ViewSpec {
  mark: 'area';
  baseline?: number;
  connect?: 'adjacent' | 'across';
  curve?: D3AreaCurveName;
}

/** Describe a band across an ordered x field. */
export function area(data?: unknown): AreaState {
  return new AreaState({
    data: normalizeDataSource(data) as AreaViewState['data'],
    mark: 'area',
    encoding: {}
  });
}

export class AreaState extends ChartState<AreaViewState> {
  chartModule() {
    return areaModule;
  }

  protected override compileSpec(spec: ViewSpec): ViewSpec {
    return compileViewWithCompiler(spec, { scene: [] }, AREA_SPEC_COMPILER);
  }

  override x(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.x(field, { type: 'nominal', ...options });
  }

  override y(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.y(field, { type: 'quantitative', ...options });
  }

  /** Set the value from which an ordinary area grows. Defaults to zero. */
  baseline(value: number): this {
    if (!Number.isFinite(value)) throw new Error('Area baseline must be a finite number.');
    return this.with({ baseline: value });
  }

  /** Shape both Area boundaries with an exact D3 curve export name. */
  curve(value: D3AreaCurveName): this {
    if (!isD3AreaCurveName(value)) {
      throw new Error(
        `Area curve must be a D3 curve that supports areas: ${D3_AREA_CURVE_NAMES.join(', ')}.`
      );
    }
    return this.with({ curve: value });
  }

  /** Preserve filtered gaps, or explicitly connect the surviving observations. */
  connect(value: 'adjacent' | 'across'): this {
    if (value !== 'adjacent' && value !== 'across') {
      throw new Error('Area connect must be "adjacent" or "across".');
    }
    return this.with({ connect: value });
  }

  /** Split each x total into stacked parts. Color remains an explicit choice. */
  breakdown(field: string, options: Record<string, unknown> = {}): this {
    if (!field) throw new Error('Area breakdown needs a field name.');
    return this.with({
      detail: {
        mode: 'stacked',
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

  /** Combine stacked parts into one total at every x value. */
  rollup(options: Record<string, unknown> = {}): this {
    return this.with({
      detail: {
        mode: 'single',
        op: String(options['op'] ?? 'sum'),
        ...(options['as'] ? { as: String(options['as']) } : {}),
        ...(options['color'] ? { color: colorFrom(options['color'] as string) } : {})
      }
    }, 'detail') as this;
  }
}
