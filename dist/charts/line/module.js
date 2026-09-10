import { defineChartModule } from '../module.js';
export const chartModule = defineChartModule({
    key: 'line',
    load: () => import('./plugin.js')
});
