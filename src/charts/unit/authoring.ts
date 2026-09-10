import type { ChannelSpec, ViewSpec } from '../../types/index.js';
import { ChartState, colorFrom, normalizeDataSource } from '../authoring.js';
import { compileViewWithCompiler } from '../compile-view.js';
import { createUnitSpecCompiler } from './compile.js';
import { chartModule as unitModule } from './module.js';

const UNIT_SPEC_COMPILER = createUnitSpecCompiler();

export interface UnitViewState extends ViewSpec {
  mark: 'unit';
  unit?: Record<string, unknown>;
}

export function unit(data?: unknown): UnitState {
  return new UnitState({ data: normalizeDataSource(data) as UnitViewState['data'], mark: 'unit', encoding: {}, unit: {} });
}

export class UnitState extends ChartState<UnitViewState> {
  chartModule() {
    return unitModule;
  }

  protected override compileSpec(spec: ViewSpec): ViewSpec {
    return compileViewWithCompiler(spec, { scene: [] }, UNIT_SPEC_COMPILER, { axis: 'layout' });
  }

  value(field: string, options: { maxUnits?: number } = {}): this {
    return this.with({
      unit: {
        ...(this.state['unit'] as Record<string, unknown> || {}),
        value: field,
        ...(options.maxUnits ? { maxUnits: options.maxUnits } : {})
      }
    });
  }

  label(field: string): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), label: field }
    });
  }

  columns(value: number): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), columns: value }
    });
  }

  radius(value: number): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), radius: value }
    });
  }

  group(field: string, options: Record<string, unknown> = {}): this {
    const { color, ...layoutOptions } = options;
    return withUnitAxis(this, {
      layout: 'groupedGrid',
      group: field,
      ...layoutOptions,
      ...(color ? { color: colorFrom(color as string) } : {})
    }) as unknown as this;
  }

  timeline(field: string, options: Record<string, unknown> = {}): this {
    return withUnitAxis(this, {
      layout: 'timeline',
      ...unitAxisChannel(this, 'x', field, options)
    }) as unknown as this;
  }

  dodge(field: string, options: Record<string, unknown> = {}): this {
    return withUnitAxis(this, {
      layout: 'dodge',
      ...unitAxisChannel(this, 'x', field, options)
    }) as unknown as this;
  }
}

function withUnitAxis(state: UnitState, axis: Record<string, unknown>): UnitState {
  return state.axis(axis) as unknown as UnitState;
}

function unitAxisChannel(
  state: UnitState,
  channel: string,
  field: string,
  options: Record<string, unknown> = {}
): Record<string, unknown> {
  const { title, type, ...rest } = options;
  const current = (state.state['encoding'] as Record<string, ChannelSpec>)?.[channel];
  if ((field == null || field === current?.field) && title == null && type == null) {
    return rest;
  }
  return {
    [channel]: {
      field,
      type: (type as string) || 'quantitative',
      ...(title ? { title } : {})
    },
    ...rest
  };
}
