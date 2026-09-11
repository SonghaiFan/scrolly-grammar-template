import type { ChartPlugin } from '../../types/index.js';
import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import type { PointViewState } from './authoring.js';
import { canonicalPointTransitionPair, pointIntermediateSpecs } from './state.js';

export const plugin: ChartPlugin<PointViewState> = defineChartType<PointViewState>({
  key: 'point',
  transitionEvaluation: 'cached',
  scenes: ['selection', 'axis', 'detail', 'mapping'],
  defaults: {
    // Two readable header rows: legend first, then the upward y-axis title.
    margin: () => ({ top: 56, right: 20, bottom: 40, left: 44 })
  },
  createRenderer: createPointRenderer,
  createSpecCompiler: createPointSpecCompiler,
  transition: {
    canonicalPair: canonicalPointTransitionPair,
    intermediateSpecs: pointIntermediateSpecs,
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'point-default-plan' })
  }
});
