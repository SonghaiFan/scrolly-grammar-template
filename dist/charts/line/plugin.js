import { createLineSpecCompiler } from './compile.js';
import { createLineRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
export const plugin = defineChartType({
    key: 'line',
    scenes: ['selection', 'axis', 'detail', 'mapping'],
    createRenderer: createLineRenderer,
    createSpecCompiler: createLineSpecCompiler,
    transition: {
        plan: (previousSpec, nextSpec) => createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'line-default-plan' })
    }
});
