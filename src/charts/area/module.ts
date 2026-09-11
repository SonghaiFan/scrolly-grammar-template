import { defineChartModule } from '../module.js';
import type { AreaViewState } from './authoring.js';

export const chartModule = defineChartModule<AreaViewState>({
  key: 'area',
  load: () => import('./plugin.js')
});
