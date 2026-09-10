import { defineChartType } from '../plugin.js';
import { createBarChart } from './chart.js';
// createBarSpecCompiler is still in compile.js (not yet migrated)
import { createBarSpecCompiler } from './compile.js';
export const plugin = defineChartType({
    key: 'bar',
    transitionEvaluation: 'cached',
    scenes: ['selection', 'axis', 'detail', 'mapping'],
    createChart: createBarChart,
    createSpecCompiler: createBarSpecCompiler
});
