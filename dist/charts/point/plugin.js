import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import { canonicalPointTransitionPair, pointIntermediateSpecs } from './state.js';
export const plugin = defineChartType({
    key: 'point',
    transitionEvaluation: 'cached',
    scenes: ['selection', 'axis', 'detail', 'mapping'],
    createRenderer: createPointRenderer,
    createSpecCompiler: createPointSpecCompiler,
    transition: {
        canonicalPair: canonicalPointTransitionPair,
        intermediateSpecs: pointIntermediateSpecs,
        plan: (previousSpec, nextSpec) => createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'point-default-plan' })
    }
});
