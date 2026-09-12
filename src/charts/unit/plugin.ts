import type { ChartPlugin } from '../../types/index.js';
import { createUnitSpecCompiler } from './compile.js';
import { createUnitRenderer } from './render.js';
import { defineChartType } from '../plugin.js';
import { canonicalUnitTransitionPair, resolveUnitTransitionPlan } from './state.js';
import type { UnitViewState } from './authoring.js';
import { chartStyle } from '../style.js';

export const plugin: ChartPlugin<UnitViewState> = defineChartType<UnitViewState>({
  key: 'unit',
  transitionEvaluation: 'cached',
  scenes: ['selection', 'axis', 'mapping'],
  stateOperations: { axis: 'layout' },
  defaults: {
    margin: (_spec, deps) => chartStyle(deps).charts.unit.margin
  },
  createRenderer: createUnitRenderer,
  createSpecCompiler: createUnitSpecCompiler,
  transition: {
    canonicalPair: canonicalUnitTransitionPair,
    plan: resolveUnitTransitionPlan
  }
});
