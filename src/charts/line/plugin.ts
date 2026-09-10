import type { ChartPlugin } from '../../types/index.js';
import { createLineSpecCompiler } from './compile.js';
import { createLineRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import type { LineViewState } from './authoring.js';

export const plugin: ChartPlugin<LineViewState> = defineChartType<LineViewState>({
  key: 'line',
  scenes: ['selection', 'axis', 'detail', 'mapping'],
  createRenderer: createLineRenderer,
  createSpecCompiler: createLineSpecCompiler,
  transition: {
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'line-default-plan' })
  }
});
