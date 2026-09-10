import type { TransitionPlan, ViewSpec } from '../types/index.js';
import { diffViewStates } from '../grammar/diff.js';
import { specTransition } from '../spec-meta.js';
import { defaultTransition } from '../timing.js';

interface TransitionPlanOptions {
  reason?: string;
}

export function createDefaultTransitionPlan(
  previousSpec: ViewSpec | null | undefined,
  nextSpec: ViewSpec | null | undefined,
  options: TransitionPlanOptions = {}
): TransitionPlan {
  if (!previousSpec || !nextSpec) return {} as TransitionPlan;

  const diff = diffViewStates(previousSpec, nextSpec);
  const timing = defaultTransition({
    ...specTransition(previousSpec),
    ...specTransition(nextSpec)
  });
  const reason = options.reason || 'default-chart-transition';

  return {
    diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next })),
    reason,
    steps: [{ changes: ['scale', 'axis', 'marks', 'exit', 'enter'] }],
    timing,
    totalDuration: (timing.duration ?? 0) + staggerMax(timing.stagger),
    enter: {
      mode: 'ordinary',
      reason
    },
    exit: {
      mode: 'ordinary',
      reason
    }
  } as TransitionPlan;
}

function staggerMax(stagger: unknown): number {
  if (stagger == null || typeof stagger !== 'object') return 0;
  const max = Number((stagger as Record<string, unknown>)['max']);
  return Number.isFinite(max) ? max : 0;
}
