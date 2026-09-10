import { defineChartModule } from '../module.js';
import type { BarViewState } from './authoring.js';

export const chartModule = defineChartModule<BarViewState>({
  key: 'bar',
  load: () => import('./plugin.js')
});
