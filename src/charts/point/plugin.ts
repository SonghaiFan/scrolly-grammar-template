import type { ChartPlugin } from '../../types/index.js';
import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import type { PointViewState } from './authoring.js';
import { canonicalPointTransitionPair, pointIntermediateSpecs } from './state.js';
import { chartStyle } from '../style.js';

export const plugin: ChartPlugin<PointViewState> = defineChartType<PointViewState>({
  key: 'point',
  transitionEvaluation: 'cached',
  scenes: ['selection', 'axis', 'detail', 'mapping'],
  defaults: {
    // Two readable header rows: legend first, then the upward y-axis title
    // close to the plot boundary.
    margin: (_spec, deps) => chartStyle(deps).charts.point.margin
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
