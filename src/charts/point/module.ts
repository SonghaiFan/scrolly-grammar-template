import { defineChartModule } from '../module.js';
import type { PointViewState } from './authoring.js';

export const chartModule = defineChartModule<PointViewState>({
  key: 'point',
  load: () => import('./plugin.js')
});
