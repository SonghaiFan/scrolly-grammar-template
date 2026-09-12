import type { StaggerSpec, TimingDefaults, TransitionSpec } from './types/index.js';

export const DEFAULT_TIMING: TimingDefaults = {
  transition: {
    duration: 900,
    ease: 'cubicInOut',
    // Matched marks, scales, axes, and grid share one clock by default.
    // A chart may add an explicit per-mark delay only when its operation has
    // a meaningful order.
    stagger: 0
  },
  step: {
    minDuration: 180
  },
  unit: {
    axisDurationMultiplier: 1.35,
    xRatio: 0.42
  }
};

/** Defaults applied only after an author explicitly enables per-mark delay. */
export const DEFAULT_MARK_DELAY: Required<StaggerSpec> = {
  step: 10,
  max: 120,
  by: ''
};

export function defaultTransition(overrides: Partial<TransitionSpec> = {}): Required<TransitionSpec> {
  const staggerPatch: Partial<StaggerSpec> = typeof overrides.stagger === 'object'
    ? overrides.stagger as Partial<StaggerSpec>
    : {};
  const stagger: StaggerSpec | number =
    typeof overrides.stagger === 'object'
      ? { ...DEFAULT_MARK_DELAY, ...staggerPatch }
      : overrides.stagger ?? 0;

  return {
    ...DEFAULT_TIMING.transition,
    ...overrides,
    stagger
  } as Required<TransitionSpec>;
}

export function stepDuration(totalDuration: number | undefined, stepCount: number): number {
  return Math.max(
    DEFAULT_TIMING.step.minDuration,
    Math.round((totalDuration ?? DEFAULT_TIMING.transition.duration) / Math.max(stepCount, 1))
  );
}
