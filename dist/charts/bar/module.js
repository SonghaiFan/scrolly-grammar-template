import { defineChartModule } from '../module.js';
export const chartModule = defineChartModule({
    key: 'bar',
    load: () => import('./plugin.js')
});
