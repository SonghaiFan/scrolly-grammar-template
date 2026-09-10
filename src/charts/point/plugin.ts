import type { ChartPlugin } from '../../types/index.js';
import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import type { PointViewState } from './authoring.js';

export const plugin: ChartPlugin<PointViewState> = defineChartType<PointViewState>({
  key: 'point',
  scenes: ['selection', 'axis', 'detail', 'mapping'],
  createRenderer: createPointRenderer,
  createSpecCompiler: createPointSpecCompiler,
  transition: {
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'point-default-plan' })
  }
});
