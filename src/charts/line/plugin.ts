import type { ChartPlugin } from '../../types/index.js';
import { createLineSpecCompiler } from './compile.js';
import { createLineRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartType } from '../plugin.js';
import type { LineViewState } from './authoring.js';
import { canonicalLineTransitionPair, lineIntermediateSpecs, lineObservationChange } from './state.js';
import { specState } from '../../spec-meta.js';

interface LineTransitionPlanExtension {
  observation?: {
    mode: 'add';
    addedKeys: string[];
    reason: string;
  };
}

export const plugin: ChartPlugin<LineViewState> = defineChartType<LineViewState>({
  key: 'line',
  scenes: ['selection', 'axis', 'detail', 'mapping'],
  createRenderer: createLineRenderer,
  createSpecCompiler: createLineSpecCompiler,
  transition: {
    canonicalPair: canonicalLineTransitionPair,
    intermediateSpecs: lineIntermediateSpecs,
    plan: (previousSpec, nextSpec) => {
      const plan = createDefaultTransitionPlan(previousSpec, nextSpec, {
        reason: 'line-default-plan'
      }) as ReturnType<typeof createDefaultTransitionPlan> & LineTransitionPlanExtension;
      const observation = previousSpec && nextSpec
        ? lineObservationChange(previousSpec, nextSpec)
        : null;
      if (observation?.mode === 'add') {
        plan.observation = {
          mode: 'add',
          addedKeys: observation.addedKeys,
          reason: 'line-reaches-observation-before-point-appears'
        };
        plan.reason = 'add-line-observations';
      }
      const detail = nextSpec
        ? specState(nextSpec).sceneState?.detail as Record<string, unknown> | undefined
        : undefined;
      if (detail?.['stage'] === 'segments') {
        plan.reason = detail['position'] === 'total'
          ? 'split-line-into-segments'
          : 'move-line-segments-to-series';
      } else if (previousSpec && nextSpec) {
        const previousDetail = specState(previousSpec).sceneState?.detail as Record<string, unknown> | undefined;
        if (previousDetail?.['stage'] === 'segments') plan.reason = 'connect-line-segments';
      }
      return plan;
    }
  }
});
