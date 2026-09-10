import { defineChartModule } from '../module.js';
export const chartModule = defineChartModule({
    key: 'unit',
    load: () => import('./plugin.js')
});
