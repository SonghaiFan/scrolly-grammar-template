import { defineChartModule } from '../module.js';
import type { UnitViewState } from './authoring.js';

export const chartModule = defineChartModule<UnitViewState>({
  key: 'unit',
  load: () => import('./plugin.js')
});
