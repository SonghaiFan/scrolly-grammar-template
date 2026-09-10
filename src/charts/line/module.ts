import { defineChartModule } from '../module.js';
import type { LineViewState } from './authoring.js';

export const chartModule = defineChartModule<LineViewState>({
  key: 'line',
  load: () => import('./plugin.js')
});
