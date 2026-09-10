import { defineChartModule } from '../module.js';
export const chartModule = defineChartModule({
    key: 'point',
    load: () => import('./plugin.js')
});
